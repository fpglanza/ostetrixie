import type { ISODate } from './dates';

export interface Mamma {
  id: string;
  nome: string;
  cognome?: string;
  telefono?: string;
  /** Before v1.2; age is now typed (eta) but a stored birth date still drives it. */
  dataNascita?: ISODate;
  /** Age in years as typed on `etaAl`; shown grown by the years passed since. */
  eta?: number;
  etaAl?: ISODate;
  anamnesi?: string;
  /** Previous pregnancies and births: one history that grows, not per pregnancy. */
  anamnesiOstetrica?: string;
  archiviata: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gravidanza {
  id: string;
  mammaId: string;
  /** Ultima mestruazione; DPP and EG are always computed from it. */
  upm?: ISODate;
  /** The UPM was dated (or corrected) by ultrasound. */
  upmEco?: boolean;
  stato: 'in_corso' | 'conclusa';
  dataParto?: ISODate;
  /** Notes on this pregnancy: ultrasounds, tests, anything about it. */
  gravidanzaAttuale?: string;
  partner?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incontro {
  id: string;
  gravidanzaId: string;
  data: ISODate;
  ora?: string;
  stato: 'programmato' | 'fatto';
  tipo: 'gravidanza' | 'parto' | 'puerperio';
  visita?: 'primo' | 'controllo';
  argomento?: string;
  partnerPresente: 'si' | 'no' | 'nd';
  attivita?: string;
  pavimentoPelvico?: boolean;
  valutazionePavimento?: string;
  sinfisiFondoCm?: number;
  pesoKg?: number;
  pressione?: string;
  bcf?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Impostazioni {
  id: 'main';
  pinHash?: string;
  pinSalt?: string;
  timeoutMinuti: number;
  ultimoBackup?: string;
}
