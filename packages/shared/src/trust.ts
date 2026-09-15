// Cahier des charges §9/§11: "Le Trust Score doit mesurer la fiabilité
// comportementale... être explicable. Il ne constitue ni un score de
// richesse, ni une garantie de solvabilité." Every dimension below is
// derived purely from platform behavior — never balance or net worth.
export enum TrustDimensionKey {
  PAYMENTS = "PAYMENTS",
  TENURE = "TENURE",
  ENGAGEMENT = "ENGAGEMENT",
  SECURITY = "SECURITY",
  CONSISTENCY = "CONSISTENCY",
}

export enum TrustLevel {
  A_RENFORCER = "A_RENFORCER",
  NIVEAU_MOYEN = "NIVEAU_MOYEN",
  BON_NIVEAU = "BON_NIVEAU",
}

export interface TrustDimension {
  key: TrustDimensionKey;
  label: string;
  description: string;
  score: number;
  maxScore: number;
}

export interface TrustScoreDetail {
  total: number;
  level: TrustLevel;
  levelLabel: string;
  dimensions: TrustDimension[];
}
