import { analyze, detectAll, quickScan } from './core/engine';
import { getBuiltinProfile } from './core/policy';

if (typeof window !== 'undefined') {
  (window as any).P2ShieldEngine = {
    analyze,
    detectAll,
    quickScan,
    getBuiltinProfile,
  };
}
