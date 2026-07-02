export type UnitCode =
  | "pcs"
  | "ea"
  | "m"
  | "mm"
  | "cm"
  | "kg"
  | "g"
  | "l"
  | "set"
  | "box"
  | "pack"
  | "unknown";

export type CatalogItemStatus =
  | "active"
  | "discontinued"
  | "replacement-available"
  | "unknown";

export type CatalogAttribute = {
  name: string;
  value: string;
  unit?: UnitCode;
};

export type CatalogItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  customerPartNumbers?: string[];
  attributes: CatalogAttribute[];
  defaultUnit: UnitCode;
  price?: {
    amount: number;
    currency: string;
  };
  status: CatalogItemStatus;
  replacementSku?: string;
  updatedAt?: string;
};
