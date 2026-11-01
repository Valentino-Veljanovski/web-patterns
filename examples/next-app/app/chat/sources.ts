import type { AssistantSource } from "web-patterns/chat";

// Built from the site's own content. On the artist site these come from the data file that also
// renders the pages, so an answer can never say more than the page does.
export const SOURCES: AssistantSource[] = [
  {
    keywords: ["music", "song", "songs", "listen", "album"],
    answer: "Start with the featured songs and the listening links on the Music page.",
    link: { label: "Music", href: "/chat#music" },
  },
  {
    keywords: ["theatre", "theater", "stage", "award", "awards"],
    answer: "The Theatre page lists the stage productions and the public awards.",
    link: { label: "Theatre", href: "/chat#theatre" },
  },
  {
    keywords: ["studio", "recording", "production"],
    answer: "The Studio section describes recording and production work.",
    link: { label: "Studio", href: "/chat#studio" },
  },
  {
    keywords: ["book", "booking", "contact", "hire", "request"],
    answer: "For booking, media or studio requests use the Contact section and include city, date and request type.",
    link: { label: "Contact", href: "/contact" },
  },
];

export const FALLBACK = "I can help with the music, theatre work, studio work, public links and booking.";
export const GREETING = "Hello. Ask me about music, theatre, studio work or booking.";
export const STARTERS = ["Tell me about the music", "What theatre work is listed?", "How can I book the artist?"];
