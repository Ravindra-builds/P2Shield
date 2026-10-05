// Small embedded word lists used by the heuristic (Basic mode) detectors.
// These are intentionally compact. They raise confidence; they are not the only signal.

const w = (s: string) => s.split(/\s+/).filter(Boolean);

export const FIRST_NAMES = new Set(
  w(`Aarav Aarti Aditi Aditya Akash Akshay Amit Amita Amrita Anand Ananya Anil Anita Anjali Ankit Anna Anup Anushka
  Arjun Arun Aryan Asha Ashok Ayesha Bharat Chetan Deepak Deepika Devansh Dinesh Divya Gaurav Geeta Gopal Harish
  Harsh Ishaan Isha Jaya Jayesh Kabir Kajal Kamal Karan Karthik Kavita Kiran Krishna Kunal Lakshmi Lalit Madhav
  Mahesh Manish Manoj Meena Meera Mohan Mohit Mukesh Nabeel Nandini Naveen Neha Nikhil Nisha Pankaj Pooja Prabhu
  Pradeep Prakash Pranav Priya Priyanka Rachna Raghav Rahul Raj Rajesh Rajiv Rakesh Ramesh Ravi Rekha Rishi Rohan
  Rohit Ritu Sachin Sakshi Sameer Sandeep Sanjay Sanjana Sapna Sarita Saurabh Shivam Shreya Shruti Siddharth Simran
  Sneha Sonia Sonam Suman Sunil Sunita Suresh Sushil Swati Tanvi Tarun Tushar Uday Varun Vijay Vikas Vikram Vinay
  Vinod Vishal Vivek Yash Yogesh Zoya Zara Imran Irfan Salman Faisal Farhan Fatima Aamir
  Alice Amanda Andrew Angela Anthony Barbara Benjamin Brian Carol Charles Christopher Daniel David Deborah Donald
  Dorothy Edward Elizabeth Emily Emma Eric Frank George Helen Jacob James Jason Jennifer Jessica Joseph Joshua
  Karen Kevin Kimberly Laura Linda Lisa Margaret Mary Matthew Michael Michelle Nancy Nicholas Olivia Patricia
  Paul Rebecca Richard Robert Ryan Samantha Sarah Sophia Stephanie Steven Susan Thomas Timothy William
  Aaron Abigail Adam Adrian Aiden Alan Albert Alex Alexander Alexandra Alexis Alicia Allison Amy Andrea Ann Anne
  Annie Ashley Benjamin Beth Bethany Betty Brandon Brenda Brittany Bruce Bryan Caleb Cameron Carl Caroline Catherine
  Charlotte Cheryl Chloe Christina Christine Cindy Claire Clara Cody Colin Connor Courtney Craig Cynthia Danielle
  Denise Dennis Derek Diana Diane Dominic Donna Douglas Dylan Eleanor Elena Elijah Ella Ellen Emilia Ethan Evan
  Evelyn Gabriel Gabriella Gary Gerald Gina Gloria Gregory Hannah Harold Harry Heather Henry Isaac Isabella
  Jacqueline Jake Janet Janice Jared Jasmine Jeffrey Jenna Jeremy Jerry Jesse Jillian Joan Joe Joel John Jonathan
  Josephine Joyce Juan Judith Judy Julia Julian Julie Justin Kaitlyn Katherine Kathleen Kathryn Katie Keith Kelly
  Kenneth Kyle Larry Lauren Leah Leonard Liam Lillian Lori Lucas Lucy Luis Luke Maria Marie Marilyn Martha Megan
  Melissa Mia Monica Natalie Nathan Nicole Noah Oliver Pamela Patrick Peter Philip Rachel Ralph Raymond Ronald Roy
  Russell Ruth Samuel Sandra Scott Sean Sharon Shirley Sophie Stanley Stephen Teresa Theresa Tiffany Todd Tyler
  Valerie Vanessa Vincent Walter Wayne Zachary
  Alejandro Ana Andres Camila Carmen Eduardo Fernando Gabriela Javier Jorge Lucia Manuel Mariana Miguel Pablo
  Pedro Rafael Ricardo Roberto Rosa Sofia Valentina Ximena Mateo Matteo Lorenzo Giovanni Giuseppe Francesca Luca
  Marco Pierre Andreas Anton Dmitri Hans Ivan Jens Klaus Lars Mikhail Natalia Olga Sergei Stefan Svetlana Tatiana
  Vladimir Wolfgang Yuri Zoltan Bjorn Jurgen Ingrid Astrid Sven Henrik
  Ahmad Ahmed Ali Amira Fatma Hassan Hussein Ibrahim Khalid Layla Mahmoud Mariam Mohamed Mohammed Muhammad Mustafa
  Omar Rania Samir Tariq Youssef Yusuf Zainab Aisha Hamza Bilal Abdul Abdullah Noor Huda Rashid Karim
  Wei Ming Xiao Hiroshi Takashi Yuki Haruto Sakura Kenji Satoshi Minjun Jiwoo Seojun Hyun Jin Mei Ling
  Chinedu Ngozi Oluwaseun Adebayo Kwame Kofi Amara Abebe Thabo Sipho Zanele Chiamaka Emeka
  Abhishek Ajay Alok Amar Ankita Anuj Arvind Ashish Avinash Bhavna Chirag Darshan Dhruv Gautam Hemant Hitesh Jatin
  Kartik Mayank Neeraj Nitin Pallavi Parth Prateek Pratik Preeti Puneet Ritesh Rupali Sahil Sanket Shikha Shubham
  Sumit Tanmay Utkarsh Vaibhav Vandana Vineet Vishnu Yamini Ayaan Reyansh Vihaan Advik Saanvi Anika Diya Myra Kiara
  Arnav Atharv Rudra Shaurya Kavya Riya Sara Sana Arif Asif Danish Sameera Shabnam Ramesh Ganesh Lokesh Naresh
  Mahendra Rajendra Surendra Jitendra Devendra Narendra Venkat Srinivas Lakshman Murali Balaji Senthil Karthikeyan
  Arjun Hari Meenakshi Padma Radha Revathi Swathi Divya Keerthi Ishita Tanya Nidhi Payal Komal Monika Rashmi
  Rohini Shalini Shweta Sonali Tanuja Varsha Bhavya Charu Garima Harshita Juhi Kriti Manasi Mitali Namrata Poonam`),
);

export const SURNAMES = new Set(
  w(`Sharma Verma Singh Kumar Gupta Agarwal Aggarwal Patel Shah Mehta Joshi Reddy Rao Nair Iyer Iyengar Menon Pillai
  Khan Ali Ahmed Ansari Sheikh Mishra Pandey Tiwari Dubey Yadav Chauhan Thakur Jain Bansal Malhotra Kapoor Chopra
  Bhatia Saxena Srivastava Banerjee Mukherjee Chatterjee Das Dutta Ghosh Bose Sen Roy Pal Paul Naidu Choudhary
  Chowdhury Desai Kulkarni Patil Deshmukh Jadhav Shinde Pawar Kaur Gill Sandhu Bhat Hegde Shetty Kamath Smith
  Johnson Williams Brown Jones Miller Davis Wilson Anderson Taylor Thomas Moore Martin Jackson White Harris
  Clark Lewis Walker Hall Allen Young King Wright Scott Green Baker Adams Nelson Hill Campbell Mitchell
  Agrawal Arora Bajaj Bhatt Chaudhary Chawla Dhillon Garg Goel Goyal Grover Kohli Krishnan Mahajan Malik Mathur
  Nayak Raju Rana Rastogi Rathore Sahni Sethi Sinha Soni Subramanian Suri Talwar Tandon Trivedi Venkatesh Vyas
  Wadhwa Gowda Prasad Murthy Hussain Rahman Siddiqui Qureshi Mirza Baig Chakraborty Bhattacharya Sarkar Mondal
  Garcia Martinez Rodriguez Hernandez Lopez Gonzalez Perez Sanchez Ramirez Torres Flores Rivera Gomez Diaz Cruz
  Morales Ortiz Gutierrez Chavez Ramos Reyes Romero Alvarez Mendoza Ruiz Castillo Jimenez Moreno Vasquez Silva
  Santos Oliveira Souza Costa Pereira Nguyen Tran Pham Wang Zhang Liu Chen Yang Huang Zhao Zhou Kim Lee Park Choi
  Jung Kang Cho Yoon Tanaka Suzuki Takahashi Watanabe Yamamoto Nakamura Kobayashi Sato Muller Schmidt Schneider
  Fischer Weber Meyer Wagner Becker Schulz Hoffmann Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci
  Dubois Bernard Durand Leroy Moreau Laurent Ivanov Smirnov Kuznetsov Popov Petrov Novak Kowalski Nowak Murphy
  Kelly Walsh Byrne Robinson Thompson Turner Phillips Parker Evans Edwards Collins Stewart Morris Rogers Reed
  Morgan Cooper Richardson Howard Ward Peterson Watson Brooks Sanders Bennett Barnes Ross Henderson Coleman
  Jenkins Perry Powell Patterson Hughes Butler Simmons Foster Bryant Griffin Hayes Myers Hamilton Graham Sullivan
  Wallace Reynolds Fisher Ellis Harrison Gibson Mcdonald Marshall Murray Freeman Wells Webb Simpson Stevens Tucker
  Crawford Boyd Kennedy Warren Dixon Burns Gordon Holmes Palmer Ferguson Hawkins Perkins Hudson Spencer Gardner
  Matthews Arnold Watkins Olson Carroll Duncan Snyder Cunningham Bradley Andrews Harper Riley Armstrong Carpenter
  Elliott Lawrence Abdullah Haddad Khalil Mansour Nasser Saleh Okafor Okonkwo Adeyemi Mensah Boateng Nkosi Dlamini`),
);

/** Capitalised words that are NOT names (used to reject false PERSON matches). */
export const STOP_WORDS = new Set(
  w(`I The A An My Our Your His Her Its Their This That These Those There Here Please Hello Hi Hey Dear Sorry Happy
  Sure Not Very Just Also Still Currently Already Always Never Sometimes Today Tomorrow Yesterday Monday Tuesday
  Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October
  November December Doctor Dr Patient Developer Engineer Manager Teacher Customer Employee Client User Admin Team
  Student Nurse Sir Madam Mr Mrs Ms Miss Shri Smt Prof New Old Good Great Fine Ok Okay Yes No And Or But If So
  To From In On At Of For With By As Is Are Was Were Be Been Being Have Has Had Do Does Did Can Could Will Would
  Should Shall May Might Must What When Where Who Why How Which Some Any All Each Every Both Most More Less
  Project Company Hospital Bank Confidential Internal Note Notes Subject Regards Thanks Thank Sincerely Best
  Account Phone Email Mobile Address Name Number Date Age Id Card Password Key Token Secret`),
);

export const CITIES: Record<string, string> = {
  Mumbai: 'Maharashtra', Pune: 'Maharashtra', Nagpur: 'Maharashtra', Nashik: 'Maharashtra',
  Delhi: 'Delhi', 'New Delhi': 'Delhi', Noida: 'Uttar Pradesh', Lucknow: 'Uttar Pradesh', Kanpur: 'Uttar Pradesh',
  Varanasi: 'Uttar Pradesh', Agra: 'Uttar Pradesh', Gurgaon: 'Haryana', Gurugram: 'Haryana', Faridabad: 'Haryana',
  Bengaluru: 'Karnataka', Bangalore: 'Karnataka', Mysuru: 'Karnataka', Mysore: 'Karnataka',
  Chennai: 'Tamil Nadu', Coimbatore: 'Tamil Nadu', Madurai: 'Tamil Nadu',
  Hyderabad: 'Telangana', Visakhapatnam: 'Andhra Pradesh', Vijayawada: 'Andhra Pradesh',
  Kolkata: 'West Bengal', Howrah: 'West Bengal', Patna: 'Bihar', Gaya: 'Bihar',
  Jamshedpur: 'Jharkhand', Ranchi: 'Jharkhand', Dhanbad: 'Jharkhand', Bokaro: 'Jharkhand',
  Ahmedabad: 'Gujarat', Surat: 'Gujarat', Vadodara: 'Gujarat', Rajkot: 'Gujarat',
  Jaipur: 'Rajasthan', Jodhpur: 'Rajasthan', Udaipur: 'Rajasthan', Kota: 'Rajasthan',
  Bhopal: 'Madhya Pradesh', Indore: 'Madhya Pradesh', Chandigarh: 'Chandigarh', Ludhiana: 'Punjab', Amritsar: 'Punjab',
  Kochi: 'Kerala', Thiruvananthapuram: 'Kerala', Kozhikode: 'Kerala', Guwahati: 'Assam',
  Bhubaneswar: 'Odisha', Cuttack: 'Odisha', Dehradun: 'Uttarakhand', Raipur: 'Chhattisgarh', Goa: 'Goa',
  London: 'the UK', Manchester: 'the UK', 'New York': 'New York State', 'San Francisco': 'California',
  'Los Angeles': 'California', Seattle: 'Washington State', Boston: 'Massachusetts', Chicago: 'Illinois',
  Toronto: 'Ontario', Singapore: 'Singapore', Dubai: 'the UAE', Sydney: 'New South Wales',
  Thane: 'Maharashtra', Aurangabad: 'Maharashtra', Ghaziabad: 'Uttar Pradesh', Meerut: 'Uttar Pradesh',
  Prayagraj: 'Uttar Pradesh', Allahabad: 'Uttar Pradesh', Mangaluru: 'Karnataka', Mangalore: 'Karnataka',
  Hubli: 'Karnataka', Tiruchirappalli: 'Tamil Nadu', Salem: 'Tamil Nadu', Warangal: 'Telangana', Guntur: 'Andhra Pradesh',
  Tirupati: 'Andhra Pradesh', Siliguri: 'West Bengal', Durgapur: 'West Bengal', Bhagalpur: 'Bihar', Muzaffarpur: 'Bihar',
  Jabalpur: 'Madhya Pradesh', Gwalior: 'Madhya Pradesh', Jalandhar: 'Punjab', Shimla: 'Himachal Pradesh',
  Srinagar: 'Jammu and Kashmir', Jammu: 'Jammu and Kashmir', Thrissur: 'Kerala', Shillong: 'Meghalaya', Imphal: 'Manipur',
  Agartala: 'Tripura', Gangtok: 'Sikkim', Puducherry: 'Puducherry', Pondicherry: 'Puducherry', Haridwar: 'Uttarakhand',
  Birmingham: 'the UK', Edinburgh: 'Scotland', Glasgow: 'Scotland', Dublin: 'Ireland', Paris: 'France', Lyon: 'France',
  Berlin: 'Germany', Munich: 'Germany', Hamburg: 'Germany', Frankfurt: 'Germany', Amsterdam: 'the Netherlands',
  Rotterdam: 'the Netherlands', Brussels: 'Belgium', Zurich: 'Switzerland', Geneva: 'Switzerland', Vienna: 'Austria',
  Madrid: 'Spain', Barcelona: 'Spain', Lisbon: 'Portugal', Rome: 'Italy', Milan: 'Italy', Stockholm: 'Sweden',
  Oslo: 'Norway', Copenhagen: 'Denmark', Helsinki: 'Finland', Warsaw: 'Poland', Prague: 'Czechia', Moscow: 'Russia',
  Istanbul: 'Turkey', Riyadh: 'Saudi Arabia', Jeddah: 'Saudi Arabia', Doha: 'Qatar', 'Abu Dhabi': 'the UAE',
  Sharjah: 'the UAE', Muscat: 'Oman', Kuwait: 'Kuwait', Karachi: 'Pakistan', Lahore: 'Pakistan', Islamabad: 'Pakistan',
  Dhaka: 'Bangladesh', Kathmandu: 'Nepal', Colombo: 'Sri Lanka', Tokyo: 'Japan', Osaka: 'Japan', Beijing: 'China',
  Shanghai: 'China', Shenzhen: 'China', 'Hong Kong': 'Hong Kong', Seoul: 'South Korea', Taipei: 'Taiwan',
  Bangkok: 'Thailand', Jakarta: 'Indonesia', Manila: 'the Philippines', 'Kuala Lumpur': 'Malaysia', Hanoi: 'Vietnam',
  Lagos: 'Nigeria', Nairobi: 'Kenya', Cairo: 'Egypt', Johannesburg: 'South Africa', 'Cape Town': 'South Africa',
  Accra: 'Ghana', 'Mexico City': 'Mexico', 'Sao Paulo': 'Brazil', 'Rio de Janeiro': 'Brazil', 'Buenos Aires': 'Argentina',
  Bogota: 'Colombia', Lima: 'Peru', Santiago: 'Chile', Houston: 'Texas', Dallas: 'Texas', Miami: 'Florida',
  Atlanta: 'Georgia (US)', Denver: 'Colorado', Philadelphia: 'Pennsylvania', 'San Diego': 'California',
  'San Jose': 'California', 'Las Vegas': 'Nevada', Detroit: 'Michigan', Minneapolis: 'Minnesota', Portland: 'Oregon',
  Vancouver: 'British Columbia', Montreal: 'Quebec', Calgary: 'Alberta', Ottawa: 'Ontario', Melbourne: 'Victoria (AU)',
  Brisbane: 'Queensland', Perth: 'Western Australia', Adelaide: 'South Australia', Auckland: 'New Zealand',
};

export const MEDICAL_CONDITIONS = [
  'type 1 diabetes', 'type 2 diabetes', 'type i diabetes', 'type ii diabetes', 'diabetes', 'diabetic', 'prediabetes',
  'hypertension', 'high blood pressure', 'low blood pressure', 'hypotension', 'asthma', 'cancer', 'tumou?r',
  'leukemia', 'lymphoma', 'hiv', 'aids', 'tuberculosis', 'covid-?19', 'covid', 'depression', 'anxiety',
  'bipolar disorder', 'schizophrenia', 'ptsd', 'adhd', 'autism', 'epilepsy', 'arthritis', 'osteoporosis',
  'hypothyroidism', 'hyperthyroidism', 'thyroid', 'pcos', 'pcod', 'anaemia', 'anemia', 'migraine', 'stroke',
  'heart attack', 'heart disease', 'heart failure', 'cardiac arrest', 'arrhythmia', 'kidney disease',
  'kidney failure', 'ckd', 'hepatitis(?: [abc])?', 'cirrhosis', 'fatty liver', 'copd', 'dementia', 'alzheimer\'?s?',
  'parkinson\'?s?', 'high cholesterol', 'obesity', 'pregnan(?:t|cy)', 'miscarriage', 'chemotherapy',
  'radiotherapy', 'dialysis', 'allerg(?:y|ies)', 'eczema', 'psoriasis', 'ulcerative colitis', 'crohn\'?s',
  'sleep apnou?ea', 'insomnia', 'eating disorder', 'addiction', 'rehab', 'malaria', 'dengue', 'typhoid',
  'pneumonia', 'bronchitis', 'glaucoma', 'cataract', 'sickle cell', 'thalassemia', 'hemophilia',
];

export const MEDICATIONS = [
  'metformin', 'insulin', 'glimepiride', 'gliclazide', 'sitagliptin', 'atorvastatin', 'rosuvastatin', 'amlodipine',
  'losartan', 'telmisartan', 'lisinopril', 'atenolol', 'metoprolol', 'levothyroxine', 'thyroxine', 'warfarin',
  'clopidogrel', 'aspirin', 'omeprazole', 'pantoprazole', 'sertraline', 'fluoxetine', 'escitalopram',
  'alprazolam', 'clonazepam', 'lithium', 'olanzapine', 'risperidone', 'amoxicillin', 'azithromycin',
  'ciprofloxacin', 'doxycycline', 'ibuprofen', 'paracetamol', 'acetaminophen', 'prednisone', 'prednisolone',
  'albuterol', 'salbutamol', 'montelukast', 'cetirizine', 'tamoxifen', 'methotrexate', 'hydroxychloroquine',
  'remdesivir', 'gabapentin', 'pregabalin', 'tramadol', 'morphine', 'oxycodone', 'xanax', 'zoloft', 'prozac',
];

export const MONTHS = new Set(
  w(`January February March April May June July August September October November December`),
);
