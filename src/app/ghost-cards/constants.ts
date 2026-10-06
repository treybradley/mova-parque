/** Max history cards behind the live front card in Cards trail view. */
export const CARDS_MAX_HISTORY = 15;

/** Default Z gap between cards (world units). */
export const DEFAULT_CARD_SPACING = 0.55;
/** Widest Z gap the Spacing slider allows. */
export const MAX_CARD_SPACING = 1.4;

export type TrailView = "flat" | "cards";

export type CardsStyle = {
  glass: boolean;
  showFloor: boolean;
  borderColor: string;
  /** Border thickness in UI units (1–10). Converted to world units in GhostCardDeck. */
  borderWidth: number;
  borderOpacity: number;
  /** Z spacing between cards (world units). Default = DEFAULT_CARD_SPACING. */
  cardSpacing: number;
};

export const DEFAULT_CARDS_STYLE: CardsStyle = {
  glass: true,
  showFloor: true,
  borderColor: "#009dff",
  borderWidth: 1,
  borderOpacity: 0.85,
  cardSpacing: DEFAULT_CARD_SPACING,
};

/** Map UI border width (1–10) to R3F world-unit frame thickness. */
export function cardsBorderWorldThickness(uiWidth: number): number {
  const clamped = Math.max(1, Math.min(10, uiWidth));
  return clamped * 0.006;
}
