export interface IardProduct {
  id: string;
  label: string;
  perThousand: number;
}

export const IARD_PRODUCTS: IardProduct[] = [
  { id: "rc-auto", label: "RC auto", perThousand: 17 },
  { id: "pj-auto", label: "PJ auto", perThousand: 19 },
  { id: "omnium", label: "Omnium", perThousand: 19 },
  { id: "rc-familiale", label: "RC familiale", perThousand: 22.5 },
  { id: "rc-entreprise", label: "RC entreprise", perThousand: 20 },
  { id: "mrh", label: "MRH", perThousand: 27 },
];

export interface VieProduct {
  id: string;
  label: string;
  basis: "monthly" | "capital";
  factor: number;
}

export const VIE_PRODUCTS: VieProduct[] = [
  { id: "axa", label: "AXA", basis: "monthly", factor: 0.912 },
  { id: "vivium-ag", label: "Vivium / AG", basis: "monthly", factor: 0.647 },
  { id: "dela", label: "DELA", basis: "capital", factor: 6 },
];
