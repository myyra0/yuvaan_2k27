import { EventItem } from "@/lib/data/festivalData";
import { ComicBookData, WebChain, COMIC_THEMES } from "./types";
import { PhysicalCard, PhysicalWebMidpoint } from "./physics";

export interface GeneratedLayout {
  chains: WebChain[];
  totalHeight: number;
  cardW: number;
  cardH: number;
}

/**
 * Rolls procedural tilt angle with comic diamond variance
 */
function rollAngle(isDiamond: boolean): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  let mag: number;
  if (isDiamond) {
    mag = 0.55 + Math.random() * 0.35; // ~0.55 to 0.90
  } else {
    mag = 0.12 + Math.random() * 0.50; // ~0.12 to 0.62
  }
  return sign * mag;
}

/**
 * Generates procedurally placed hanging chains with guaranteed non-parallel & non-complementary angles
 */
export function generateWebChains(
  events: EventItem[],
  width: number,
  isMobile: boolean
): GeneratedLayout {
  const cardW = isMobile ? 258 : 300;
  const cardH = isMobile ? 352 : 406;
  // Snug initial drop from ceiling so the first cards sit high and visible
  const topWebGap = isMobile ? 70 : 85;

  // Prepare comic books data in defined issue order
  const comicItems: ComicBookData[] = events.slice(0, 10).map((ev, idx) => {
    const theme = COMIC_THEMES[idx % COMIC_THEMES.length];
    return {
      event: ev,
      issueNumber: idx + 1,
      bgColor: theme.bgColor,
      accentColor: theme.accentColor,
      burstText: theme.burstText,
    };
  });

  // Group events by day so each web holds events from a single day
  const dayOrder = ["Day 1", "Day 2", "Day 3"];
  const dayGroups: ComicBookData[][] = dayOrder.map((day) =>
    comicItems.filter((ci) => ci.event.day === day).slice(0, 3)
  );

  const chains: WebChain[] = [];

  const initChain = (
    chainIdx: number,
    chainBooks: ComicBookData[],
    anchorFraction: number,
    chainAngles: number[],
    chainOffsets: number[]
  ) => {
    const anchorX = width * anchorFraction;
    const ceilingAnchor = { x: anchorX, y: 0 };
    const chainCards: PhysicalCard[] = [];
    const chainMidpoints: PhysicalWebMidpoint[] = [];

    let currentRestY = topWebGap;

    chainBooks.forEach((comic, idx) => {
      const restAngle = chainAngles[idx % chainAngles.length];
      const offset = chainOffsets[idx % chainOffsets.length];

      // Ensure non-clipping boundary with center corridor and screen edges
      const cosA = Math.abs(Math.cos(restAngle));
      const sinA = Math.abs(Math.sin(restAngle));
      const halfW = (cardW / 2) * cosA + (cardH / 2) * sinA;

      let restX = anchorX + offset;
      if (!isMobile) {
        if (chainIdx === 0) {
          // Left chain right edge cannot cross left corridor
          const maxAllowed = width * (1 / 3) - 25;
          if (restX + halfW > maxAllowed) {
            restX = maxAllowed - halfW;
          }
          if (restX - halfW < 20) {
            restX = 20 + halfW;
          }
        } else if (chainIdx === 1) {
          // Center chain stays within the middle column
          const minAllowed = width * (1 / 3) + 25;
          const maxAllowed = width * (2 / 3) - 25;
          if (restX - halfW < minAllowed) {
            restX = minAllowed + halfW;
          }
          if (restX + halfW > maxAllowed) {
            restX = maxAllowed - halfW;
          }
        } else {
          // Right chain left edge cannot cross right corridor
          const minAllowed = width * (2 / 3) + 25;
          if (restX - halfW < minAllowed) {
            restX = minAllowed + halfW;
          }
          if (restX + halfW > width - 20) {
            restX = width - 20 - halfW;
          }
        }
      }

      // Web Gap: snug top drop, generous inter-card silk
      const webGap = idx === 0 ? topWebGap : Math.round(160 + Math.random() * 160);
      currentRestY += webGap + cardH / 2;
      const restY = currentRestY;

      // Varied lateral corner attachments
      const lateralCorner = Math.sign(restAngle) > 0 ? cardW * 0.28 : -cardW * 0.28;
      const topAttachOffset = {
        x: -lateralCorner + (Math.random() - 0.5) * 24,
        y: -cardH * (0.38 + Math.random() * 0.08),
      };
      const bottomAttachOffset = {
        x: lateralCorner + (Math.random() - 0.5) * 24,
        y: cardH * (0.38 + Math.random() * 0.08),
      };

      // Initial drop position
      const initialY = restY - 140 - idx * 25;
      const initialX = restX + (Math.random() - 0.5) * 20;

      const card = new PhysicalCard(
        initialX,
        initialY,
        restX,
        restY,
        restAngle,
        cardW,
        cardH,
        comic,
        topAttachOffset,
        bottomAttachOffset
      );
      chainCards.push(card);

      const fromCardIdx = idx === 0 ? -1 : idx - 1;
      const toCardIdx = idx;
      const midX = (anchorX + restX) / 2;
      const midY = initialY - cardH / 2 - webGap / 2;
      chainMidpoints.push(
        new PhysicalWebMidpoint(midX, midY, chainIdx, fromCardIdx, toCardIdx)
      );

      currentRestY += cardH / 2;
    });

    chains.push({
      id: chainIdx,
      anchorX,
      ceilingAnchor,
      cards: chainCards,
      webMidpoints: chainMidpoints,
    });
  };

  if (isMobile) {
    // Mobile: 1 centered hanging chain of up to 10 books in defined order
    const mobileAngles: number[] = [];
    const mobileOffsets: number[] = [];
    const mobileItems = comicItems.slice(0, 10);
    for (let i = 0; i < mobileItems.length; i++) {
      const sign = i % 2 === 0 ? -1 : 1;
      const isDiamond = i % 3 === 1;
      const mag = isDiamond ? 0.68 + Math.random() * 0.20 : 0.32 + Math.random() * 0.18;
      mobileAngles.push(sign * mag);
      mobileOffsets.push(sign * (45 + Math.random() * 35));
    }
    initChain(0, mobileItems, 0.5, mobileAngles, mobileOffsets);
  } else {
    // Desktop: 3 chains, one per day, 3 events each
    const anchors = [1 / 6, 1 / 2, 5 / 6];
    for (let c = 0; c < 3; c++) {
      const group = dayGroups[c];
      if (!group || group.length === 0) continue;
      const chainAngles: number[] = [];
      const chainOffsets: number[] = [];
      for (let i = 0; i < group.length; i++) {
        const isDiamond = Math.random() < 0.35;
        chainAngles.push(rollAngle(isDiamond));
        chainOffsets.push((Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 90));
      }
      initChain(c, group, anchors[c], chainAngles, chainOffsets);
    }
  }

  const maxChainY = Math.max(
    ...chains.map((c) => c.cards[c.cards.length - 1].restY + cardH / 2 + 350)
  );

  return {
    chains,
    totalHeight: maxChainY,
    cardW,
    cardH,
  };
}
