import { existsSync } from "node:fs";
import { join } from "node:path";
import GuideFigure from "@/app/components/GuideFigure";
import type { Guide } from "./types";

const imagePath = "/images/guides/why-i-started-simchacam";
const featuredImage = `${imagePath}/featured.png`;
const createEventImage = `${imagePath}/create-event.png`;

const guide: Guide = {
  title: "Why I Started SimchaCam",
  slug: "why-i-started-simchacam",
  excerpt:
    "SimchaCam didn't begin as a business idea. It started because my cousin asked me to live stream her wedding.",
  publishedDate: "2026-06-25",
  author: "David Mendelsohn",
  readingTime: "6 min read",
  featuredImage: existsSync(join(process.cwd(), "public", featuredImage))
    ? featuredImage
    : undefined,
  seoTitle: "Why I Started SimchaCam | SimchaCam",
  seoDescription:
    "The story behind SimchaCam and why I built a simple, private livestreaming platform for weddings, simchas and family events.",
  content: (
    <>
      <p>SimchaCam didn&apos;t begin as a business idea.</p>

      <p>It started because my cousin asked me to live stream her wedding.</p>

      <p>
        At the time, the conflict between Israel and Iran had disrupted travel,
        and many family members simply couldn&apos;t get to the UK. Her brother
        wasn&apos;t able to attend. Her grandmother was too elderly to travel.
        Several members of the groom&apos;s family were also stuck in Israel.
      </p>

      <p>
        For everyone who couldn&apos;t be there in person, the live stream
        wasn&apos;t just a nice extra—it was the only way they could share in
        the day.
      </p>

      <p>
        Wanting to do the best job I could, I started looking for the right
        platform.
      </p>

      <p>That&apos;s when I fell down the rabbit hole.</p>

      <p>
        At first, it seemed like there should be plenty of options. There are
        lots of services that let you broadcast video, but none of them felt
        like they were designed for a family celebration.
      </p>

      <p>
        I looked at Zoom, Microsoft Teams and Google Meet. They&apos;re
        excellent for meetings, but a wedding isn&apos;t a meeting. Guests can
        accidentally unmute themselves, cameras can appear on screen, and the
        whole experience feels more like a conference call than a special
        occasion. Zoom&apos;s free plan also has time limits for longer events.
      </p>

      <p>
        I explored Vimeo, but it felt aimed at professional creators and
        involved far more setup than I wanted for a one-off family event.
      </p>

      <p>Eventually, I settled on YouTube.</p>

      <p>
        Once it was working, it was brilliant. I was genuinely amazed by the
        quality you could achieve with nothing more than a smartphone on a
        tripod.
      </p>

      <p>But getting there was another story.</p>

      <p>
        Before I could stream from my phone, I had to verify my identity, meet
        YouTube&apos;s eligibility requirements and then wait for approval
        before I could finally go live.
      </p>

      <p>
        I also wanted the stream to be private. This was a family wedding, not a
        public broadcast. I wanted to know that only the people we&apos;d
        invited could watch.
      </p>

      <p>When the wedding day arrived, everything worked beautifully.</p>

      <p>The messages I received afterwards were what stayed with me the most.</p>

      <p>
        Family in Israel told me they felt like they had genuinely been part of
        the wedding despite being thousands of miles away. People who had no
        way of travelling still got to watch the chuppah, hear the music and
        celebrate with everyone else in real time.
      </p>

      <p>That&apos;s when I realised the technology wasn&apos;t the problem.</p>

      <p>
        The problem was that there wasn&apos;t a platform built specifically
        for moments like these.
      </p>

      <p>So I decided to build one.</p>

      <p>
        SimchaCam is designed to make live streaming a family event as simple
        as possible. Create an event, share a single link and start streaming.
        Guests don&apos;t need to download an app or create an account—they
        just click the link and watch. If you want extra privacy, you can
        password-protect your event, and if you want to keep the memories, you
        can record and replay the stream afterwards.
      </p>

      {existsSync(join(process.cwd(), "public", createEventImage)) && (
        <GuideFigure
          src={createEventImage}
          alt="The SimchaCam Create Event page"
          caption="Creating a private livestream event in SimchaCam."
        />
      )}

      <p>
        My hope is simple: no one should have to miss life&apos;s biggest
        moments just because they can&apos;t be there in person.
      </p>

      <p>That&apos;s why I built SimchaCam.</p>
    </>
  ),
};

export default guide;
