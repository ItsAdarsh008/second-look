import { CALENDAR } from "@/data/calendar";
import { CASES, getCase } from "@/data/cases";
import { INCIDENTS } from "@/data/incidents";
import { toSpotRounds } from "@/data/spot";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SpotTheProblem } from "@/components/landing/spot-the-problem";
import { Story } from "@/components/landing/story";
import { ReviewApp } from "@/components/review/review-app";
import { capabilities, incidentSummaries } from "@/lib/capabilities";
import { toExampleCases } from "@/lib/examples";
import { MARKETS } from "@/lib/schema";

// Static: capabilities are read from env at build time, which is when Vercel provides them.
// `?case=` is read on the client, so it doesn't force dynamic rendering.
export default function Home() {
  const caps = capabilities();
  return (
    <>
      <ReviewApp examples={toExampleCases(CASES)} incidents={incidentSummaries()} {...caps} />
      <SpotTheProblem rounds={toSpotRounds(CASES)} markets={MARKETS.length} />
      <HowItWorks incidents={INCIDENTS.length} dates={CALENDAR.length} markets={MARKETS.length} />
      <Story photos={getCase("starbucks-korea")?.history?.photos ?? []} />
    </>
  );
}
