/** Max history cards behind the live front card in Cards trail view. */
export const CARDS_MAX_HISTORY = 15;

export type TrailView = "flat" | "cards";

export type CardsStyle = {
  glass: boolean;
  showFloor: boolean;
  borderColor: string;
  /** World-unit padding around each card face (0 = no border). */
  borderWidth: number;
  borderOpacity: number;
};

export const DEFAULT_CARDS_STYLE: CardsStyle = {
  glass: true,
  showFloor: true,
  borderColor: "#e8eef8",
  borderWidth: 0.02,
  borderOpacity: 0.85,
};

export const CARD_BORDER_PRESETS: { label: string; color: string }[] = [
  { label: "Frost", color: "#e8eef8" },
  { label: "Gold", color: "#c9a45c" },
  { label: "Ink", color: "#1a1d24" },
  { label: "Rose", color: "#d4a0a8" },
  { label: "Teal", color: "#6aa8a4" },
];
