import type { ISODate } from './dates';

export interface Mamma {
  id: string;
  nome: string;
  cognome?: string;
  telefono?: string;
  dataNascita?: ISODate;
  anamnesi?: string;
  archiviata: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gravidanza {
  id: string;
  mammaId: string;
  upm?: ISODate;
  dppEco?: ISODate;
  stato: 'in_corso' | 'conclusa';
  dataParto?: ISODate;
  anamnesiOstetrica?: string;
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
  tipo: 'controllo' | 'accompagnamento' | 'puerperio' | 'altro';
  argomento?: string;
  partnerPresente: 'si' | 'no' | 'nd';
  attivita?: string;
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
