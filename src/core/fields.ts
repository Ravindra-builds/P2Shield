// Structured-field detector: finds sensitive values by the NAME of the field they sit in.
//
// Handles JSON / JS objects / Python dicts, YAML, .env / INI / shell exports, HTTP headers,
// XML tags, function arguments, CLI flags, prose ("my routing number is ...") and
// CSV / TSV / Markdown tables (column headers or two-column key/value tables).
//
// Each key maps to an ordered list of candidate kinds; the first kind whose value-shape check
// passes wins. So "card_token_raw": "5412..." is a card, while "card_token_raw": "tok_9f..." is a secret.

import { isPlaceholder, looksLikeCodeRef, mk } from './detectors';
import { FIRST_NAMES, STOP_WORDS } from './lexicon';
import { aadhaarValid, abaValid, ibanValid, ipv6Valid, luhnValid, onlyDigits, shannonEntropy } from './validators';
import type { Detection, EntityType } from './types';

type Kind =
  | 'SEED' | 'CARD' | 'PIN' | 'PASSWORD' | 'SECRET' | 'SECRET_STRICT'
  | 'ROUTING' | 'SWIFT' | 'IFSC' | 'IBAN' | 'CRYPTO' | 'UPI' | 'ACCOUNT'
  | 'SSN' | 'AADHAAR' | 'PAN_IN' | 'TAX_ID' | 'NATIONAL_ID' | 'PASSPORT' | 'DRIVER_LICENSE' | 'MRN' | 'INSURANCE_ID'
  | 'VEHICLE' | 'EMPLOYEE_ID'
  | 'PHONE' | 'EMAIL' | 'DOB' | 'AGE' | 'IP' | 'MAC'
  | 'PERSON' | 'PERSON_STRICT' | 'USERNAME'
  | 'ORGANIZATION' | 'ADDRESS' | 'CITY' | 'POSTAL' | 'COORDINATES' | 'ENDPOINT' | 'ENDPOINT_WEAK'
  | 'MEDICAL' | 'MEDICATION' | 'AMOUNT';

/** Kinds that hold a secret or an account/ID number. Descriptive keys ("token_type") don't trigger them. */
const VALUE_KINDS = new Set<Kind>([
  'SEED', 'CARD', 'PIN', 'PASSWORD', 'SECRET', 'SECRET_STRICT', 'ROUTING', 'SWIFT', 'IFSC', 'IBAN', 'CRYPTO', 'UPI',
  'ACCOUNT', 'SSN', 'AADHAAR', 'PAN_IN', 'TAX_ID', 'NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE', 'MRN', 'INSURANCE_ID',
  'VEHICLE', 'EMPLOYEE_ID',
]);

/** Kinds accepted from prose ("X is Y"), where false positives are likelier. */
const SPOKEN_KINDS = new Set<Kind>([
  'CARD', 'PIN', 'PASSWORD', 'SECRET', 'ROUTING', 'SWIFT', 'IFSC', 'IBAN', 'CRYPTO', 'UPI', 'ACCOUNT', 'SSN', 'AADHAAR',
  'PAN_IN', 'TAX_ID', 'NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE', 'MRN', 'INSURANCE_ID', 'VEHICLE', 'EMPLOYEE_ID',
  'PHONE', 'DOB', 'ADDRESS', 'USERNAME', 'SEED',
]);

const w = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

/** Words that make a key describe a value rather than hold it: token_type, password_min_length, card_expiry ... */
const META = w(`type kind format fmt length len size min max limit count timeout ttl expiry expires expiration expire
  lifetime duration enabled enable disabled required policy rule rules regex pattern prefix suffix label placeholder
  hint description desc help field column header param params parameter url uri endpoint path file filename dir
  directory version algorithm alg scope scopes audience issuer provider strength attempts retries retry name names
  mode status state flag flags strategy method methods env var variable changed updated created issued at last mask
  masked visible show hide cache template index idx encoding charset style class icon title message msg error err
  brand network bin last4 lastfour digits holder owner location manager rotation`);

const KEY_QUALIFIERS = w(`api access secret private account master encryption encrypt signing sign client app
  application license licence subscription service storage auth consumer admin root ssh gpg pgp deploy server shared
  sas x aws gcp azure openai anthropic stripe google firebase mapbox sendgrid twilio slack github gitlab jwt hmac aes
  rsa crypto wallet recovery backup developer dev prod production live test secure session product activation`);

const PERSON_QUALIFIERS = w(`first last full middle given family sur maiden nick legal display real preferred contact
  customer client patient employee member owner holder card cardholder account beneficiary nominee guardian parent
  spouse father mother emergency recipient sender payee payer billing shipping person manager doctor physician
  applicant candidate student child kid wife husband partner signer signatory witness tenant landlord buyer seller
  passenger guest visitor attendee primary secondary next kin referrer insured policyholder subscriber traveler
  traveller driver rider author assignee reporter reviewer approver`);

const PERSON_KEYS = w(`firstname lastname fullname surname givenname familyname middlename maidenname nickname legalname
  displayname realname preferredname nombre apellido apellidos prenom vorname nachname cardholder cardholdername
  accountholder accountholdername accountname beneficiary beneficiaryname nominee nomineename guardian guardianname
  spouse spousename fathername mothername fathersname mothersname emergencycontact emergencycontactname nextofkin
  contactperson contactname patientname customername clientname employeename membername ownername holdername
  recipientname sendername payeename payername signatory signedby applicantname candidatename studentname parentname
  doctorname physicianname managername referredby passengername guestname tenantname landlordname insuredname
  policyholder policyholdername travelername drivername`);

const PERSON_ROLE_KEYS = w(`patient customer client employee applicant candidate student passenger guest tenant
  beneficiary nominee guardian spouse payee payer recipient sender owner holder doctor physician manager contact father
  mother parent emergency author assignee reporter reviewer approver createdby modifiedby updatedby requester requestedby
  insured policyholder traveler traveller driver witness signer`);

const USER_KEYS = w(`username user login loginid userid uname usr handle screenname gamertag upn samaccountname
  loginname logonname principal`);

const ORG_KEYS = w(`company companyname employer employername organization organisation org orgname organizationname
  organisationname business businessname firm institution school university college hospital bank bankname insurer
  insurancecompany workplace`);

const DEFAULT_ACCOUNTS = w(`admin administrator root user guest test postgres sa ubuntu ec2-user default system service
  anonymous nobody demo`);

function keyTokens(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const kindCache = new Map<string, Kind[]>();

/** Ordered candidate kinds for a field name. */
export function kindsForKey(key: string): Kind[] {
  const cached = kindCache.get(key);
  if (cached) return cached;
  const result = computeKinds(key);
  if (kindCache.size > 2000) kindCache.clear();
  kindCache.set(key, result);
  return result;
}

function computeKinds(key: string): Kind[] {
  const T = keyTokens(key);
  if (!T.length || T.length > 7) return [];
  const S = new Set(T);
  const J = T.join('');
  const has = (...ws: string[]) => ws.some((x) => S.has(x));
  const sub = (re: RegExp) => re.test(J);
  const meta = T.some((t) => META.has(t));
  const personish = has('holder', 'owner') || (has('name') && !has('user', 'file', 'host', 'app', 'project', 'bucket'));
  const k: Kind[] = [];

  // ---- secrets and numbers -------------------------------------------------------------------
  if (sub(/mnemonic|seedphrase|recoveryphrase|seedwords|backupphrase|secretphrase/)) k.push('SEED');
  if (!personish && (has('card', 'cc', 'ccn', 'ccnum', 'cardno', 'cardnum', 'cardnumber', 'creditcard', 'debitcard', 'tarjeta', 'carte', 'kreditkarte') || sub(/creditcard|debitcard|cardnumber|cardnum|cardno|ccnumber|ccnum/))) {
    k.push('CARD');
  }
  if (has('pin', 'pincode') && (has('code') || J === 'pincode')) k.push('POSTAL');
  else if (has('pin', 'mpin', 'tpin', 'otp', 'cvv', 'cvv2', 'cvc', 'cvc2', 'cvn', 'csc') || sub(/securitycode|verificationcode|onetimepassword|onetimecode/)) {
    k.push('PIN');
  }
  if (has('pwd', 'pass', 'pw', 'pword', 'passwd', 'senha', 'clave', 'parola') || sub(/password|passwort|kennwort|contrasena|motdepasse|wachtwoord|passphrase|passcode/)) {
    k.push('PASSWORD');
  }
  if (has('routing', 'aba', 'rtn', 'transit', 'bsb') || sub(/routingnumber|routingno|sortcode/) || (has('sort') && has('code'))) k.push('ROUTING');
  if (has('swift', 'bic', 'swiftcode', 'swiftbic')) k.push('SWIFT');
  if (has('ifsc')) k.push('IFSC');
  if (has('iban')) k.push('IBAN');
  if (has('wallet', 'btc', 'eth', 'bitcoin', 'ethereum', 'usdt', 'crypto')) k.push('CRYPTO');
  if (has('upi', 'vpa')) k.push('UPI');
  if (
    !personish &&
    !has('email', 'mail', 'user', 'login', 'type', 'status', 'executive', 'plan', 'tier', 'role') &&
    (has('account', 'acct', 'acc', 'accno', 'acctno', 'accountno', 'accountnumber', 'bankaccount', 'konto', 'cuenta', 'compte') || J === 'ac' || sub(/accountnumber|accountno|acctnumber|bankaccount/))
  ) {
    k.push('ACCOUNT');
  }
  if (has('ssn', 'ssnumber', 'sin', 'nino') || sub(/socialsecurity|socialinsurance|nationalinsurance|ninumber/)) k.push('SSN');
  if (has('aadhaar', 'aadhar', 'adhar', 'uidai') || J === 'uid') k.push('AADHAAR');
  if (has('pan') || sub(/^pan(?:number|no|card|id)$/)) k.push('PAN_IN', 'CARD');
  if (has('tin', 'ein', 'fein', 'itin', 'vat', 'gst', 'gstin', 'abn', 'utr', 'tfn') || sub(/taxid|taxpayer|taxnumber|taxno|taxref|vatnumber|vatno|vatid|steuerid|steuernummer/)) {
    k.push('TAX_ID');
  }
  if (
    has('nid', 'nic', 'nric', 'dni', 'nie', 'cpf', 'cnpj', 'curp', 'rfc', 'hkid', 'mykad', 'cnic', 'nin', 'bvn', 'bsn', 'pesel', 'personnummer', 'epic') ||
    sub(/nationalid|nationalidentity|idnumber|idno$|identitynumber|identitycard|idcard|citizenid|residentid|civilid|personalid|govid|governmentid|voterid|emiratesid|codicefiscale/)
  ) {
    k.push('NATIONAL_ID');
  }
  if (has('passport')) k.push('PASSPORT');
  if (sub(/driverlicen|driverslicen|drivinglicen|licen[cs]enumber|licen[cs]eno|dlnumber|dlno/) || (has('dl') && has('number', 'no')) || ((has('license', 'licence') && !has('key', 'plate')))) {
    k.push('DRIVER_LICENSE');
  }
  if (has('mrn', 'uhid', 'nhs', 'abha', 'medicare', 'medicaid') || sub(/patientid|medicalrecord|healthid|chartnumber/)) k.push('MRN');
  if (has('insurance') || sub(/policynumber|policyno|policyid|memberid|subscriberid|groupnumber|insuranceid/)) k.push('INSURANCE_ID');
  if (has('vin', 'plate', 'licenseplate', 'numberplate') || sub(/vehiclenumber|vehicleno|vehiclereg|registrationnumber|regno$/)) k.push('VEHICLE');
  if (sub(/employeeid|empid|employeeno|employeenumber|staffid|staffno|badgeid|badgenumber|workerid|empcode|employeecode/)) k.push('EMPLOYEE_ID');

  if (!sub(/tokeniz/) && !(has('tokens') && T.length > 1)) {
    if (
      sub(/secret|token|apikey|accesskey|secretkey|privatekey|privkey|clientsecret|credential|creds|bearer|jwt|signature|signingkey|encryptionkey|masterkey|licensekey|licencekey|sessiontoken|sessionkey|connectionstring|connstring|connstr|sastoken|hmac|authkey|authtoken|accesscode|authcode|refreshtoken|apisecret|appsecret|consumersecret|passkey/) ||
      has('auth', 'authorization', 'sig', 'dsn', 'salt', 'apikey', 'xsrf', 'csrf')
    ) {
      k.push('SECRET');
    } else if (has('key') && T.some((t) => KEY_QUALIFIERS.has(t))) {
      k.push('SECRET');
    } else if (J === 'key' || has('session', 'sessionid', 'sid', 'cookie', 'nonce')) {
      k.push('SECRET_STRICT');
    }
  }

  // Descriptive keys never hold the value itself.
  const out = meta ? k.filter((x) => !VALUE_KINDS.has(x)) : k;

  // ---- contact and identity --------------------------------------------------------------------
  if (has('phone', 'mobile', 'mob', 'tel', 'telephone', 'cell', 'cellphone', 'fax', 'whatsapp', 'msisdn', 'telefono', 'telefone', 'handy', 'landline', 'phoneno', 'mobileno') || sub(/phonenumber|mobilenumber|contactnumber|contactno/)) {
    out.push('PHONE');
  }
  if (has('email', 'mail', 'correo', 'courriel') || sub(/^e?mail/)) out.push('EMAIL');
  if (has('dob', 'birthdate', 'birthday', 'birth') || sub(/dateofbirth|fechadenacimiento|geburtsdatum/)) out.push('DOB');
  if (J === 'age' || (has('age') && T.some((t) => PERSON_QUALIFIERS.has(t)))) out.push('AGE');
  if (has('ip', 'ipaddress', 'ipv4', 'ipv6', 'ipaddr') || sub(/ipaddress|clientip|remoteip|hostip|serverip|publicip|privateip/)) out.push('IP');
  if (has('mac', 'macaddress', 'macaddr')) out.push('MAC');

  if (PERSON_KEYS.has(J) || (has('name', 'nm') && T.every((t) => t === 'name' || t === 'nm' || t === 'full' || PERSON_QUALIFIERS.has(t)) && T.length > 1)) {
    out.push('PERSON');
  } else if (J === 'name' || PERSON_ROLE_KEYS.has(J) || (T.length === 2 && PERSON_ROLE_KEYS.has(T[0]) && has('name'))) {
    out.push('PERSON_STRICT');
  }
  if (USER_KEYS.has(J)) out.push('USERNAME');
  if (ORG_KEYS.has(J)) out.push('ORGANIZATION');

  // ---- places ----------------------------------------------------------------------------------
  const netAddress = has('email', 'ip', 'mac', 'wallet', 'btc', 'eth', 'server', 'host', 'web', 'url', 'memory', 'contract', 'hardware', 'ether', 'bind', 'listen', 'remote', 'base', 'proxy', 'gateway', 'node');
  if (!netAddress && (has('address', 'addr', 'street', 'streetaddress', 'addressline', 'residence', 'domicile', 'direccion', 'adresse', 'anschrift', 'landmark', 'locality', 'apartment', 'apt', 'flat') || sub(/homeaddress|billingaddress|shippingaddress|mailingaddress|streetaddress|permanentaddress|currentaddress|residentialaddress/))) {
    out.push('ADDRESS');
  }
  if (has('city', 'town', 'village', 'district', 'county', 'ciudad', 'stadt', 'birthplace') || J === 'placeofbirth') out.push('CITY');
  if (has('zip', 'zipcode', 'postal', 'postcode', 'plz', 'cep') || sub(/postalcode|zipcode/)) out.push('POSTAL');
  if (has('lat', 'latitude', 'lng', 'lon', 'longitude', 'coords', 'coordinates', 'geo', 'gps', 'geolocation')) out.push('COORDINATES');
  if (has('webhook', 'callback', 'endpoint', 'hook', 'dsn', 'ingress', 'jdbc', 'ldap', 'smtp', 'redis', 'mongo', 'mongodb', 'postgres', 'postgresql', 'mysql', 'mssql', 'elastic', 'elasticsearch', 'kafka', 'amqp', 'rabbitmq', 'sftp', 'ftp', 'vpn', 'db', 'database', 'internal', 'intranet', 'vault')) {
    out.push('ENDPOINT');
  } else if (has('url', 'uri', 'host', 'hostname', 'server', 'domain', 'baseurl', 'origin', 'redirect', 'gateway', 'proxy', 'link', 'site', 'address')) {
    out.push('ENDPOINT_WEAK');
  }

  // ---- health and money ------------------------------------------------------------------------
  if (has('diagnosis', 'diagnoses', 'disease', 'diseases', 'illness', 'disorder', 'symptoms', 'symptom', 'allergy', 'allergies', 'bloodtype', 'bloodgroup', 'comorbidities', 'icd', 'icd10') || sub(/medicalhistory|medicalcondition|healthcondition|chroniccondition|preexisting|bloodtype|bloodgroup/)) {
    out.push('MEDICAL');
  }
  if (has('medication', 'medications', 'medicine', 'medicines', 'prescription', 'prescriptions', 'rx', 'dosage', 'drug', 'drugs')) out.push('MEDICATION');
  if (has('salary', 'income', 'ctc', 'compensation', 'wage', 'wages', 'payout', 'balance', 'networth', 'bonus', 'loan', 'debt', 'revenue', 'profit', 'emi', 'stipend', 'pension') || sub(/creditlimit|annualincome|monthlyincome|basesalary|grosssalary|netsalary|takehome|accountbalance/)) {
    out.push('AMOUNT');
  }
  return out;
}

// --------------------------------------------------------------------------
// Value extraction
// --------------------------------------------------------------------------

interface Raw {
  /** Value region (inside the quotes for quoted values). */
  text: string;
  /** Offset of `text` in the source. */
  start: number;
  quoted: boolean;
  spoken: boolean;
  /** Source text right after the value (used to spot function calls like `token = getToken()`). */
  after: string;
}

interface Hit {
  s: number;
  e: number;
  type: EntityType;
  conf: number;
  label?: string;
  why: string;
}

function lead(raw: Raw, re: RegExp): [number, number] | null {
  const off = raw.text.length - raw.text.trimStart().length;
  const m = new RegExp(`^(?:${re.source})`, re.flags.replace('g', '')).exec(raw.text.slice(off));
  return m ? [off, off + m[0].length] : null;
}

function firstToken(raw: Raw): [number, number] | null {
  const off = raw.text.length - raw.text.trimStart().length;
  if (raw.quoted) {
    const t = raw.text.trim();
    return t ? [off, off + t.length] : null;
  }
  const m = /^\S+/.exec(raw.text.slice(off));
  if (!m) return null;
  const v = m[0].replace(/[.,;:)\]}'"`]+$/, '');
  return v ? [off, off + v.length] : null;
}

function freeText(raw: Raw, max = 160): [number, number] | null {
  const off = raw.text.length - raw.text.trimStart().length;
  let t = raw.text.slice(off);
  if (!raw.quoted) {
    const cut = t.search(/(?<=[a-z0-9)\]])\.\s+(?=[A-Z])|\s+(?:but|so|because|which|who|please|and then)\s|[;{}[\]]/);
    if (cut >= 0) t = t.slice(0, cut);
  }
  t = t.replace(/[\s.,;:]+$/, '');
  if (!t || t.length > max) return null;
  return [off, off + t.length];
}

const CODE_PREFIX = /^(?:process\.env|import\.meta|os\.environ|os\.getenv|getenv|env\(|System\.getenv|ENV\[|config\.|settings\.|self\.|this\.|req\.|request\.|props\.|args\.|params\.|options\.|opts\.|ctx\.|context\.)/;

function looksLikeCode(v: string, after: string): boolean {
  if (looksLikeCodeRef(v)) return true;
  if (CODE_PREFIX.test(v)) return true;
  if (/^[(.[]/.test(after)) return true;
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*[([]/.test(v)) return true; // getToken(), os.environ[
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(v) && !/\d{3}/.test(v)) return true;
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(v) && !/\d/.test(v)) return true; // camelCase identifier
  if (/^[a-z]+(?:_[a-z]+)+$/.test(v)) return true; // snake_case identifier
  return false;
}

function isEnvRef(v: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(v) && !/\d/.test(v) && v.includes('_');
}

const DATE_VALUE =
  /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/;
const URLISH = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^\s/:@]+(?::[^\s/@]*)?@)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?::\d+)?(?:[/?#]\S*)?$|^(?:[a-z][a-z0-9+.-]*:\/\/)[^\s]+$/i;
const PUBLIC_HOSTS = /(?:^|\.)(?:example\.(?:com|org|net)|localhost|google\.com|github\.com|microsoft\.com|openai\.com|wikipedia\.org)$/i;

function hostOf(v: string): string {
  return v.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^[^@/]*@/, '').split(/[/:?#]/)[0].toLowerCase();
}

function internalHost(host: string): boolean {
  if (/^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return true;
  const labels = host.split('.');
  const tld = labels[labels.length - 1];
  if (['internal', 'corp', 'intranet', 'lan', 'local', 'localdomain', 'home', 'private'].includes(tld)) return true;
  return labels
    .slice(0, -1)
    .flatMap((l) => l.split('-'))
    .some((s) => ['internal', 'intranet', 'vault', 'corp', 'staging', 'stage', 'preprod', 'uat', 'private', 'priv', 'dev', 'test', 'qa', 'admin', 'db', 'prod'].includes(s));
}

/** Read capitalised name words ("Rahul Sharma", "Maria de la Cruz", "J. R. Smith"). */
function nameWords(t: string, allowLower: boolean): string {
  const re = allowLower
    ? /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019.-]*(?:\s+[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\u2019.-]*){0,4}/
    : /^(?:[A-Z\u00C0-\u00DE][a-z\u00DF-\u024F'\u2019-]*\.?|[A-Z]\.)(?:\s+(?:[A-Z\u00C0-\u00DE][A-Za-z\u00DF-\u024F'\u2019-]*\.?|[A-Z]\.|de|da|di|del|della|van|von|der|den|bin|binti|al|el|la|le|dos|das))*/;
  const m = re.exec(t);
  if (!m) return '';
  let v = m[0].trim().replace(/[.,]+$/, '');
  // Drop trailing particles and trailing lowercase connector words in prose.
  v = v.replace(/\s+(?:de|da|di|del|della|van|von|der|den|bin|binti|al|el|la|le|dos|das)$/, '');
  return v;
}

function extract(kind: Kind, raw: Raw): Hit | null {
  const q = raw.quoted ? 0.03 : 0;
  const sp = raw.spoken ? -0.04 : 0;
  const tok = () => firstToken(raw);
  const val = (r: [number, number]) => raw.text.slice(r[0], r[1]);

  switch (kind) {
    case 'SEED': {
      const r = lead(raw, /(?:[a-z]{3,8}[\s,]+){11,23}[a-z]{3,8}/);
      return r ? { s: r[0], e: r[1], type: 'SECRET', conf: 0.95, label: 'SEED_PHRASE', why: 'Wallet recovery phrase' } : null;
    }
    case 'CARD': {
      const r = lead(raw, /\d[\d -]{10,24}\d(?!\d)/);
      if (!r) return null;
      const d = onlyDigits(val(r));
      if (d.length < 12 || d.length > 19) return null;
      return { s: r[0], e: r[1], type: 'CREDIT_CARD', conf: (luhnValid(d) ? 0.97 : 0.9) + sp, why: 'Card number in a card field' };
    }
    case 'PIN': {
      const r = lead(raw, /\d{3,8}(?![\d])/);
      return r ? { s: r[0], e: r[1], type: 'PASSWORD', conf: 0.93 + sp, label: 'PIN', why: 'PIN / OTP / CVV field' } : null;
    }
    case 'PASSWORD': {
      const r = tok();
      if (!r) return null;
      const v = val(r);
      if (v.length < 3 || v.length > 200 || isPlaceholder(v) || isEnvRef(v)) return null;
      if (!raw.quoted && looksLikeCode(v, raw.after)) return null;
      if (raw.spoken && !(/\d/.test(v) || /[^A-Za-z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v)))) return null;
      return { s: r[0], e: r[1], type: 'PASSWORD', conf: 0.93 + q + sp, why: 'Value of a password field' };
    }
    case 'SECRET':
    case 'SECRET_STRICT': {
      let r = tok();
      if (!r) return null;
      // "Bearer abc...", "Token abc...", "Basic abc..."
      const pre = /^(?:bearer|token|basic|apikey|api-key|key|digest)\s+/i.exec(val(r));
      if (pre) {
        const rest: Raw = { ...raw, text: raw.text.slice(0, r[0]) + ' '.repeat(pre[0].length) + raw.text.slice(r[0] + pre[0].length), quoted: false };
        r = firstToken(rest);
        if (!r) return null;
      }
      const v = val(r);
      if (v.length < 8 || v.length > 4000 || isPlaceholder(v) || isEnvRef(v)) return null;
      if (/^(?:[a-z][a-z0-9+.-]*:\/\/)/i.test(v) && !/:[^/@\s]+@/.test(v)) return null; // a URL, not a secret
      if (/^\d{1,4}(?:\.\d+){1,3}$/.test(v) || DATE_VALUE.test(v) && v.length <= 25) return null; // version / date
      if (/^[./~]|^[A-Za-z]:\\/.test(v)) return null; // a file path
      if (!raw.quoted && looksLikeCode(v, raw.after)) return null;
      const digits = /\d/.test(v);
      const mixedCase = /[a-z]/.test(v) && /[A-Z]/.test(v);
      const symbols = /[^A-Za-z0-9_\-.]/.test(v);
      if (kind === 'SECRET_STRICT') {
        if (!((v.length >= 16 && digits && /[A-Za-z]/.test(v)) || (v.length >= 20 && shannonEntropy(v) >= 3.5))) return null;
      } else if (!(digits || mixedCase || symbols || v.length >= 20)) {
        return null;
      }
      if (raw.spoken && !(digits && v.length >= 10)) return null;
      return { s: r[0], e: r[1], type: 'SECRET', conf: (kind === 'SECRET' ? 0.94 : 0.86) + q + sp, why: 'Value of a secret / token field' };
    }
    case 'ROUTING': {
      let r = lead(raw, /\d{9}(?!\d)/);
      if (r) {
        const ok = abaValid(val(r));
        return { s: r[0], e: r[1], type: 'ROUTING_NUMBER', conf: (ok ? 0.97 : 0.86) + sp, label: 'ROUTING_NUMBER', why: ok ? 'ABA routing number (valid checksum)' : 'Routing number field' };
      }
      r = lead(raw, /\d{2}-\d{2}-\d{2}(?!\d)|\d{6}(?!\d)/);
      if (r) return { s: r[0], e: r[1], type: 'ROUTING_NUMBER', conf: 0.9 + sp, label: 'SORT_CODE', why: 'Sort code field' };
      r = lead(raw, /\d{3}-?\d{3}(?!\d)|\d{5}-\d{3}(?!\d)/);
      return r ? { s: r[0], e: r[1], type: 'ROUTING_NUMBER', conf: 0.86 + sp, label: 'ROUTING_NUMBER', why: 'Routing / transit number field' } : null;
    }
    case 'SWIFT': {
      const r = lead(raw, /[A-Za-z]{6}[A-Za-z0-9]{2}(?:[A-Za-z0-9]{3})?(?![A-Za-z0-9])/);
      return r ? { s: r[0], e: r[1], type: 'ROUTING_NUMBER', conf: 0.92 + sp, label: 'SWIFT_BIC', why: 'SWIFT / BIC field' } : null;
    }
    case 'IFSC': {
      const r = lead(raw, /[A-Za-z]{4}0[A-Za-z0-9]{6}(?![A-Za-z0-9])/);
      return r ? { s: r[0], e: r[1], type: 'IFSC', conf: 0.95 + sp, why: 'IFSC field' } : null;
    }
    case 'IBAN': {
      const r = lead(raw, /[A-Za-z]{2}\d{2}(?: ?[A-Za-z0-9]){11,34}/);
      if (!r) return null;
      return { s: r[0], e: r[1], type: 'IBAN', conf: (ibanValid(val(r)) ? 0.97 : 0.88) + sp, why: 'IBAN field' };
    }
    case 'CRYPTO': {
      const r = tok();
      if (!r) return null;
      const v = val(r);
      if (!/^(?:0x[a-fA-F0-9]{40}|(?:bc1|tb1)[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|[A-Za-z0-9]{26,64})$/.test(v) || !/\d/.test(v)) return null;
      return { s: r[0], e: r[1], type: 'BANK_ACCOUNT', conf: 0.9 + sp, label: 'CRYPTO_WALLET', why: 'Wallet address field' };
    }
    case 'UPI': {
      const r = tok();
      if (!r || !/^[\w.-]{2,}@[A-Za-z]{2,}$/.test(val(r))) return null;
      return { s: r[0], e: r[1], type: 'UPI_ID', conf: 0.93 + sp, why: 'UPI / VPA field' };
    }
    case 'ACCOUNT': {
      let r = lead(raw, /[A-Za-z]{0,4}[- ]?\d[\d -]{3,24}\d(?![\dA-Za-z])/);
      if (r) {
        const d = onlyDigits(val(r)).length;
        if (d >= 6 && d <= 20) return { s: r[0], e: r[1], type: 'BANK_ACCOUNT', conf: 0.92 + sp, why: 'Account number field' };
      }
      r = tok();
      if (!r) return null;
      const v = val(r);
      if (!/^[A-Za-z0-9_-]{6,40}$/.test(v) || (v.match(/\d/g) ?? []).length < 4) return null;
      return { s: r[0], e: r[1], type: 'BANK_ACCOUNT', conf: 0.85 + sp, why: 'Account identifier field' };
    }
    case 'SSN': {
      let r = lead(raw, /\d{3}[- ]?\d{2}[- ]?\d{4}(?![\d])/);
      if (r) return { s: r[0], e: r[1], type: 'ID_NUMBER', conf: 0.96 + sp, label: 'SSN', why: 'Social Security / Insurance number field' };
      r = lead(raw, /\d{3}[- ]?\d{3}[- ]?\d{3}(?![\d])/);
      if (r) return { s: r[0], e: r[1], type: 'ID_NUMBER', conf: 0.92 + sp, label: 'SIN', why: 'Social Insurance number field' };
      r = lead(raw, /[A-Za-z]{2} ?\d{2} ?\d{2} ?\d{2} ?[A-Da-d]?(?![A-Za-z0-9])/);
      return r ? { s: r[0], e: r[1], type: 'ID_NUMBER', conf: 0.92 + sp, label: 'NINO', why: 'National Insurance number field' } : null;
    }
    case 'AADHAAR': {
      const r = lead(raw, /[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?![\d])/);
      if (!r) return null;
      return { s: r[0], e: r[1], type: 'AADHAAR', conf: (aadhaarValid(onlyDigits(val(r))) ? 0.99 : 0.93) + sp, why: 'Aadhaar field' };
    }
    case 'PAN_IN': {
      const r = lead(raw, /[A-Za-z]{5}\d{4}[A-Za-z](?![A-Za-z0-9])/);
      return r ? { s: r[0], e: r[1], type: 'PAN', conf: 0.96 + sp, why: 'PAN field' } : null;
    }
    case 'TAX_ID':
    case 'NATIONAL_ID':
    case 'PASSPORT':
    case 'DRIVER_LICENSE':
    case 'MRN':
    case 'INSURANCE_ID':
    case 'VEHICLE':
    case 'EMPLOYEE_ID': {
      let r: [number, number] | null;
      if (raw.quoted) {
        r = tok();
      } else {
        r = lead(raw, /[A-Za-z0-9][A-Za-z0-9./-]*(?: \d[A-Za-z0-9./-]*){0,4}/);
      }
      if (!r) return null;
      const v = val(r).replace(/[./-]+$/, '');
      const digits = onlyDigits(v).length;
      if (v.length < 3 || v.length > 40 || digits < 2 || (v.match(/\s/g) ?? []).length > 4) return null;
      if (isPlaceholder(v) || new RegExp(`^(?:${DATE_VALUE.source})$`).test(v)) return null;
      if (!raw.quoted && looksLikeCode(v, raw.after)) return null;
      const e = r[0] + v.length;
      const map: Record<string, [EntityType, string | undefined, string]> = {
        TAX_ID: ['ID_NUMBER', 'TAX_ID', 'Tax ID field'],
        NATIONAL_ID: ['ID_NUMBER', 'NATIONAL_ID', 'National ID field'],
        PASSPORT: ['PASSPORT', undefined, 'Passport field'],
        DRIVER_LICENSE: ['ID_NUMBER', 'DRIVER_LICENSE', 'Driving licence field'],
        MRN: ['ID_NUMBER', 'MEDICAL_RECORD_ID', 'Medical record field'],
        INSURANCE_ID: ['ID_NUMBER', 'INSURANCE_ID', 'Insurance / policy number field'],
        VEHICLE: ['ID_NUMBER', 'VEHICLE_REG', 'Vehicle identifier field'],
        EMPLOYEE_ID: ['EMPLOYEE_ID', undefined, 'Employee ID field'],
      };
      const [type, label, why] = map[kind];
      return { s: r[0], e, type, conf: 0.91 + sp, label, why };
    }
    case 'PHONE': {
      const r = lead(raw, /\+?\(?\d[\d \t().-]{5,20}\d(?!\d)/);
      if (!r) return null;
      const d = onlyDigits(val(r)).length;
      if (d < 7 || d > 15) return null;
      return { s: r[0], e: r[1], type: 'PHONE', conf: 0.94 + sp, why: 'Phone number field' };
    }
    case 'EMAIL': {
      const r = tok();
      if (!r || !/^[^\s@<>"']+@[^\s@<>"']+$/.test(val(r))) return null;
      return { s: r[0], e: r[1], type: 'EMAIL', conf: 0.96, why: 'Email field' };
    }
    case 'DOB': {
      const r = lead(raw, DATE_VALUE);
      return r ? { s: r[0], e: r[1], type: 'DATE_OF_BIRTH', conf: 0.94 + sp, why: 'Date of birth field' } : null;
    }
    case 'AGE': {
      const r = lead(raw, /\d{1,3}(?![\d.])/);
      if (!r) return null;
      const n = Number(val(r));
      const rest = raw.text.slice(r[1]).trim();
      if (n < 1 || n > 120 || (rest && !/^(?:years?|yrs?|y\.?o\.?|[,;.)}\]]|$)/i.test(rest))) return null;
      return { s: r[0], e: r[1], type: 'AGE', conf: 0.88, why: 'Age field' };
    }
    case 'IP': {
      const r = lead(raw, /(?:\d{1,3}\.){3}\d{1,3}(?![\d.])|[0-9A-Fa-f:]{6,39}/);
      if (!r) return null;
      const v = val(r);
      if (v.includes(':') ? !ipv6Valid(v) : !v.split('.').every((p) => Number(p) <= 255)) return null;
      return { s: r[0], e: r[1], type: 'IP_ADDRESS', conf: 0.92, why: 'IP address field' };
    }
    case 'MAC': {
      const r = lead(raw, /[0-9A-Fa-f]{2}([:-])(?:[0-9A-Fa-f]{2}\1){4}[0-9A-Fa-f]{2}/);
      return r ? { s: r[0], e: r[1], type: 'IP_ADDRESS', conf: 0.92, label: 'MAC_ADDRESS', why: 'MAC address field' } : null;
    }
    case 'PERSON':
    case 'PERSON_STRICT': {
      const off = raw.text.length - raw.text.trimStart().length;
      const t = raw.text.slice(off);
      const strict = kind === 'PERSON_STRICT';
      let words = nameWords(t, raw.quoted && !strict).split(/\s+/).filter(Boolean);
      // "Rahul Sharma Phone ..." -> stop at the first word that can't be part of a name.
      const stop = words.findIndex((x, i) => i > 0 && STOP_WORDS.has(x.replace(/\.$/, '')));
      if (stop > 0) words = words.slice(0, stop);
      const v = words.join(' ');
      if (v.length < 2 || isPlaceholder(v) || /\d/.test(v)) return null;
      if (t.startsWith(v) && /[\w@]/.test(t[v.length] ?? '')) return null; // "rohit_99", "sam@x.com"
      if (words.length > 5) return null;
      if (/^(?:n\/?a|unknown|anonymous|test|user|admin|guest|someone|nobody|me|self|tbd)$/i.test(v)) return null;
      if (strict) {
        if (!/^[A-Z\u00C0-\u00DE]/.test(v) || words.some((x) => STOP_WORDS.has(x))) return null;
        if (words.length < 2 && !FIRST_NAMES.has(words[0])) return null;
      }
      return { s: off, e: off + v.length, type: 'PERSON', conf: strict ? 0.84 : 0.92, why: 'Name field' };
    }
    case 'USERNAME': {
      const r = tok();
      if (!r) return null;
      const v = val(r);
      if (!/^[A-Za-z0-9._@+\\-]{3,64}$/.test(v) || !/[A-Za-z]/.test(v) || v.includes('@')) return null;
      if (isPlaceholder(v) || DEFAULT_ACCOUNTS.has(v.toLowerCase()) || isEnvRef(v)) return null;
      if (!raw.quoted && (CODE_PREFIX.test(v) || /^[(.[]/.test(raw.after) || /[([]/.test(v))) return null;
      if (raw.spoken && !/[\d_.]/.test(v)) return null;
      return { s: r[0], e: r[1], type: 'CONFIDENTIAL', conf: 0.78 + sp, label: 'USERNAME', why: 'User name / login field' };
    }
    case 'ORGANIZATION': {
      const r = freeText(raw, 80);
      if (!r) return null;
      const v = val(r);
      if (v.length < 2 || !/[A-Za-z]/.test(v) || isPlaceholder(v)) return null;
      if (!raw.quoted && looksLikeCode(v, raw.after)) return null;
      return { s: r[0], e: r[1], type: 'ORGANIZATION', conf: 0.8, why: 'Company / organization field' };
    }
    case 'ADDRESS': {
      const r = freeText(raw, 160);
      if (!r) return null;
      const v = val(r);
      if (v.length < 5 || !/[A-Za-z]/.test(v) || isPlaceholder(v)) return null;
      if (!(/\d/.test(v) || v.includes(',') || v.split(/\s+/).length >= 3)) return null;
      return { s: r[0], e: r[1], type: 'LOCATION', conf: 0.84 + sp, label: 'ADDRESS', why: 'Address field' };
    }
    case 'CITY': {
      const off = raw.text.length - raw.text.trimStart().length;
      const t = raw.text.slice(off);
      const v = raw.quoted ? t.trim() : nameWords(t, false);
      if (v.length < 2 || v.length > 40 || /\d/.test(v) || isPlaceholder(v) || !/^[A-Za-z\u00C0-\u024F]/.test(v)) return null;
      return { s: off, e: off + v.length, type: 'LOCATION', conf: 0.8, label: 'CITY', why: 'City field' };
    }
    case 'POSTAL': {
      const r = lead(raw, /[A-Za-z0-9][A-Za-z0-9 -]{2,9}(?![A-Za-z0-9])/);
      if (!r) return null;
      const v = val(r).trim();
      if (onlyDigits(v).length < 2) return null;
      return { s: r[0], e: r[0] + v.length, type: 'LOCATION', conf: 0.86, label: 'POSTAL_CODE', why: 'Postal code field' };
    }
    case 'COORDINATES': {
      const r = lead(raw, /-?\d{1,3}\.\d{3,}(?:\s*,\s*-?\d{1,3}\.\d{3,})?/);
      return r ? { s: r[0], e: r[1], type: 'LOCATION', conf: 0.84, label: 'COORDINATES', why: 'GPS coordinate field' } : null;
    }
    case 'ENDPOINT':
    case 'ENDPOINT_WEAK': {
      const r = tok();
      if (!r) return null;
      const v = val(r);
      const host = hostOf(v);
      const ip = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
      if (!(URLISH.test(v) || ip) || host.length < 3) return null;
      if (PUBLIC_HOSTS.test(host) || /^(?:127\.|0\.0\.0\.0)/.test(host)) return null;
      if (kind === 'ENDPOINT_WEAK' && !internalHost(host)) return null;
      return { s: r[0], e: r[1], type: 'CONFIDENTIAL', conf: 0.82, label: 'ENDPOINT', why: 'Internal endpoint / webhook / server address' };
    }
    case 'MEDICAL':
    case 'MEDICATION': {
      const r = freeText(raw, 100);
      if (!r) return null;
      const v = val(r);
      if (v.length < 3 || !/[A-Za-z]{3}/.test(v) || isPlaceholder(v)) return null;
      if (!raw.quoted && looksLikeCode(v, raw.after)) return null;
      return {
        s: r[0], e: r[1], type: 'MEDICAL', conf: 0.84,
        label: kind === 'MEDICAL' ? 'MEDICAL_CONDITION' : 'MEDICATION',
        why: kind === 'MEDICAL' ? 'Health condition field' : 'Medication field',
      };
    }
    case 'AMOUNT': {
      const r = lead(raw, /(?:[₹$€£¥]|Rs\.?|INR|USD|EUR|GBP)?\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|mn|lakhs?|lacs?|crores?|cr|lpa|million|billion|bn)\b)?/i);
      if (!r || onlyDigits(val(r)).length < 2) return null;
      return { s: r[0], e: r[1], type: 'FINANCIAL', conf: 0.84, label: 'AMOUNT', why: 'Money field' };
    }
  }
  return null;
}

function emit(out: Detection[], key: string, raw: Raw, allowed?: (k: Kind) => boolean): void {
  if (!raw.text.trim()) return;
  for (const kind of kindsForKey(key)) {
    if (allowed && !allowed(kind)) continue;
    if (raw.spoken && !SPOKEN_KINDS.has(kind)) continue;
    const hit = extract(kind, raw);
    if (!hit) continue;
    const s = raw.start + hit.s;
    const e = raw.start + hit.e;
    if (e <= s) continue;
    const k = key.trim().replace(/^(?:export|set|const|let|var|final|private|public|static|readonly)\s+/i, '');
    const shown = k.length > 40 ? k.slice(0, 38) + '…' : k;
    out.push(mk(hit.type, s, e, raw.text.slice(hit.s, hit.e), hit.conf, 'rule', `${hit.why} ("${shown}")`, hit.label));
    return;
  }
}

// --------------------------------------------------------------------------
// Key / value scanners
// --------------------------------------------------------------------------

/** key [:=] value  — quoted keys may contain spaces; bare keys may be up to four words in prose. */
const KV_RE =
  /(?:(["'`])([^"'`\n]{1,60}?)\1|(?<![\w$@.\-/\\])([A-Za-z_$@][\w$.\-]*(?:[ \t]+[A-Za-z][\w.\-]*){0,3}))[ \t]*(?::=|=>|->|=(?![=>~])|:(?![:/\\=]))[ \t]*/g;

/** Where an unquoted value ends: end of line, a closing bracket, or the next "key:" / "key=". */
const NEXT_KEY =
  /[,;|][ \t]*["'`]?[A-Za-z_][\w .-]{0,30}["'`]?[ \t]*(?::(?![/\\])|=)|[}\]]|[ \t]{2,}[A-Za-z_][\w-]{0,30}[ \t]*[:=]|[ \t]+[A-Za-z][\w-]{1,30}(?:[ \t][A-Za-z][\w-]{1,20})?[ \t]?:(?![/\\:])/;

function readValue(text: string, pos: number): Raw | null {
  let p = pos;
  let ch = text[p];
  if (ch === undefined || ch === '\n' || ch === '\r') return null;
  if (/[brfuBRFU]/.test(ch) && /["']/.test(text[p + 1] ?? '') && !/\w/.test(text[p - 1] ?? '')) {
    p++;
    ch = text[p];
  }
  if (ch === '{' || ch === '[' || ch === '(' || ch === '|' || ch === '>') return null; // object, array, YAML block
  if (ch === '"' || ch === "'" || ch === '`') {
    let i = p + 1;
    const limit = Math.min(text.length, p + 4000);
    while (i < limit) {
      const c = text[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === ch) break;
      if (c === '\n' && ch !== '`') return null;
      i++;
    }
    if (i >= limit || text[i] !== ch) return null;
    return { text: text.slice(p + 1, i), start: p + 1, quoted: true, spoken: false, after: text.slice(i + 1, i + 3) };
  }
  let end = text.indexOf('\n', p);
  if (end < 0) end = text.length;
  end = Math.min(end, p + 300);
  let seg = text.slice(p, end);
  const cut = seg.search(NEXT_KEY);
  if (cut >= 0) seg = seg.slice(0, cut);
  seg = seg.replace(/\s+(?:#|\/\/)\s.*$/, ''); // trailing comments
  seg = seg.replace(/\r$/, '');
  if (!seg.trim()) return null;
  return { text: seg, start: p, quoted: false, spoken: false, after: text.slice(p + seg.length, p + seg.length + 2).trimStart() };
}

function scanKeyValues(text: string, out: Detection[]): void {
  for (const m of text.matchAll(KV_RE)) {
    const key = (m[2] ?? m[3] ?? '').trim();
    if (!key || /^\d/.test(key)) continue;
    if (!kindsForKey(key).length) continue;
    const raw = readValue(text, m.index! + m[0].length);
    if (raw) emit(out, key, raw);
  }
}

/** "my routing number is 021000021", "SSN was 123-45-6789". */
const SPOKEN_RE =
  /(?<![\w])((?:[A-Za-z][\w'\u2019-]*[ \t]+){0,3}?[A-Za-z][\w-]*)[ \t]+(?:is|was|are|equals|reads|=)[ \t]+(?:(?:as follows|the following)[ \t:]*)?/gi;

function scanSpoken(text: string, out: Detection[]): void {
  for (const m of text.matchAll(SPOKEN_RE)) {
    const key = m[1];
    if (!kindsForKey(key).some((k) => SPOKEN_KINDS.has(k))) continue;
    const raw = readValue(text, m.index! + m[0].length);
    if (raw) emit(out, key, { ...raw, spoken: !raw.quoted });
  }
}

/** <password>hunter2</password> */
function scanXml(text: string, out: Detection[]): void {
  for (const m of text.matchAll(/<([A-Za-z][\w:.-]{0,40})(?:\s[^<>]{0,200})?>([^<>\n]{1,300})<\/\1>/g)) {
    const key = m[1].replace(/^.*:/, '');
    if (!kindsForKey(key).length) continue;
    const start = m.index! + m[0].indexOf('>') + 1;
    emit(out, key, { text: m[2], start, quoted: true, spoken: false, after: '' });
  }
}

/** setPassword("..."), withApiKey('...'), --password hunter2, --token=abc */
function scanCallsAndFlags(text: string, out: Detection[]): void {
  const secretOnly = (k: Kind) => VALUE_KINDS.has(k) || k === 'USERNAME' || k === 'EMAIL' || k === 'PHONE';
  for (const m of text.matchAll(/\b([A-Za-z_][\w]{2,40})\(\s*(["'`])([^"'`\n]{1,500})\2\s*[,)]/g)) {
    const key = m[1].replace(/^(?:set|with|use|get)(?=[A-Z_])/, '');
    if (!kindsForKey(key).length) continue;
    const start = m.index! + m[0].indexOf(m[2]) + 1;
    emit(out, key, { text: m[3], start, quoted: true, spoken: false, after: '' }, secretOnly);
  }
  for (const m of text.matchAll(/(?<![\w-])--([A-Za-z][\w-]{1,40})(?:=|[ \t]+)(?!-)(["']?)([^\s"']{1,500})\2/g)) {
    const key = m[1];
    if (!kindsForKey(key).length) continue;
    const valueStart = m.index! + m[0].length - m[3].length - m[2].length;
    emit(out, key, { text: m[3], start: valueStart, quoted: true, spoken: false, after: '' }, secretOnly);
  }
}

// --------------------------------------------------------------------------
// Tables: CSV / TSV / pipe / Markdown
// --------------------------------------------------------------------------

interface Cell {
  text: string;
  start: number;
}

function splitCells(line: string, offset: number, delim: string): Cell[] {
  const cells: Cell[] = [];
  let i = 0;
  let cellStart = 0;
  let inQuote = false;
  for (; i <= line.length; i++) {
    const c = line[i];
    if (c === '"' && delim === ',') inQuote = !inQuote;
    if ((c === delim && !inQuote) || i === line.length) {
      let s = cellStart;
      let e = i;
      while (s < e && /\s/.test(line[s])) s++;
      while (e > s && /\s/.test(line[e - 1])) e--;
      if (e - s >= 2 && line[s] === '"' && line[e - 1] === '"') {
        s++;
        e--;
      }
      cells.push({ text: line.slice(s, e), start: offset + s });
      cellStart = i + 1;
    }
  }
  if (delim === '|') {
    if (cells.length && !cells[0].text) cells.shift();
    if (cells.length && !cells[cells.length - 1].text) cells.pop();
  }
  return cells;
}

const TABLE_HEADER = /^[A-Za-z\u00C0-\u024F][\w\u00C0-\u024F .#&()/'-]{0,40}$|^$/;
const CODE_LINE = /[{};]\s*$|^\s*(?:const|let|var|import|export|return|if|for|while|def|class|function|public|private|SELECT|INSERT|UPDATE)\b|=>|\(\s*\)|[=!]==?/;

function scanTables(text: string, out: Detection[]): void {
  const lines: Array<{ text: string; start: number }> = [];
  let pos = 0;
  for (const l of text.split('\n')) {
    lines.push({ text: l.replace(/\r$/, ''), start: pos });
    pos += l.length + 1;
  }
  const emitCell = (key: string, c: Cell) => {
    if (c.text) emit(out, key, { text: c.text, start: c.start, quoted: true, spoken: false, after: '' });
  };

  let i = 0;
  while (i < lines.length - 1) {
    const header = lines[i];
    const delim = ['\t', '|', ',', ';'].find((d) => header.text.includes(d));
    if (!delim) {
      i++;
      continue;
    }
    const head = splitCells(header.text, header.start, delim);
    // Column headers look like labels ("Card number", "dob", "E-mail (work)"), never like code.
    if (head.length < 2 || head.some((c) => !TABLE_HEADER.test(c.text)) || CODE_LINE.test(header.text)) {
      i++;
      continue;
    }
    let j = i + 1;
    const markdown = delim === '|' && /^\s*\|?\s*:?-{2,}/.test(lines[j]?.text ?? '');
    if (markdown) j++;
    const rows: Cell[][] = [];
    for (; j < lines.length; j++) {
      if (!lines[j].text.includes(delim) || CODE_LINE.test(lines[j].text)) break;
      const cells = splitCells(lines[j].text, lines[j].start, delim);
      const tolerance = delim === '|' || delim === '\t' ? 1 : 0;
      if (Math.abs(cells.length - head.length) > tolerance) break;
      rows.push(cells);
    }
    if (!rows.length) {
      i++;
      continue;
    }
    const kinds = head.map((c) => (/\d{3}/.test(c.text) ? [] : kindsForKey(c.text)));
    if (kinds.some((k) => k.length)) {
      // Column headers: name,email,ssn
      for (const row of rows) row.forEach((c, col) => kinds[col]?.length && emitCell(head[col].text, c));
    } else {
      // Two-column key/value table: | Card number | 5412 ... |
      for (const row of [head.map((c) => c), ...rows]) {
        if (row.length >= 2 && kindsForKey(row[0].text).length) emitCell(row[0].text, row[1]);
      }
    }
    i = j;
  }
}

/** All structured-field detections. */
export function detectFields(text: string): Detection[] {
  const out: Detection[] = [];
  scanKeyValues(text, out);
  scanSpoken(text, out);
  scanXml(text, out);
  scanCallsAndFlags(text, out);
  scanTables(text, out);
  return out;
}
