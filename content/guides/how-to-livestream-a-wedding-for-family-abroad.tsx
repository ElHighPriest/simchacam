import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import GuideFigure from "@/app/components/GuideFigure";
import type { Guide } from "./types";

const imagePath = "/images/guides/how-to-livestream-a-wedding-for-family-abroad";
const featuredImage = `${imagePath}/hero.webp`;
const grandparentsImage = `${imagePath}/grandparents-watching-remotely.webp`;
const equipmentImage = `${imagePath}/livestream-equipment-flat-lay.webp`;
const inlineLinkClass =
  "font-semibold text-[#80652f] underline decoration-gold/45 underline-offset-4 transition hover:text-navy";

const guide: Guide = {
  title: "How to Livestream a Wedding for Family Abroad",
  slug: "how-to-livestream-a-wedding-for-family-abroad",
  excerpt:
    "Practical tips for livestreaming a wedding privately and reliably, so family abroad can watch the day in real time.",
  publishedDate: "2026-07-02",
  author: "David Mendelsohn",
  readingTime: "8 min read",
  featuredImage: existsSync(join(process.cwd(), "public", featuredImage))
    ? featuredImage
    : undefined,
  featuredImageAlt:
    "A smartphone on a tripod livestreaming an outdoor wedding ceremony",
  featuredImageWidth: 1536,
  featuredImageHeight: 1024,
  seoTitle: "How to Livestream a Wedding for Family Abroad | SimchaCam",
  seoDescription:
    "Learn how to livestream a wedding for family abroad with practical tips on internet, audio, privacy, testing and choosing the right setup.",
  content: (
    <>
      <p>
        There was a time when if you couldn&apos;t make it to a wedding, you
        simply missed it.
      </p>

      <p>
        Today, families are spread all over the world. Grandparents may be
        unable to travel. Close relatives might be overseas, recovering from
        illness, serving in the military, looking after young children, or
        simply unable to leave their own families to attend.
      </p>

      <p>
        A wedding is one of life&apos;s biggest moments, and thanks to modern
        technology, the people who can&apos;t be there in person don&apos;t have
        to miss it completely.
      </p>

      <p>
        The good news is that livestreaming a wedding has never been easier.
      </p>

      <p>
        The bad news is that many people only think about it on the day itself.
      </p>

      <p>
        After building{" "}
        <Link href="/en" className={inlineLinkClass}>
          SimchaCam
        </Link>{" "}
        and speaking to families who have livestreamed their celebrations,
        I&apos;ve learned that a little planning makes the difference between a
        wonderful experience and a frustrating one.
      </p>

      <p>Here are some practical tips to help you get it right.</p>

      {existsSync(join(process.cwd(), "public", grandparentsImage)) && (
        <GuideFigure
          src={grandparentsImage}
          alt="Grandparents watching a wedding livestream from home on a laptop"
          caption="A private wedding livestream helps family abroad feel part of the day."
        />
      )}

      <h2>Start planning before the wedding day</h2>

      <p>
        One of my cousins recently celebrated a brit milah for his son. Family
        abroad desperately wanted to watch, but nobody had really planned how
        they were going to livestream it.
      </p>

      <p>In the rush, someone asked, &quot;Can you just set up a Zoom meeting?&quot;</p>

      <p>It seemed like the easiest solution.</p>

      <p>
        Unfortunately, they started the meeting around 45 minutes before the
        ceremony actually began so everyone could join. As the rabbi was
        beginning the ceremony, the meeting reached Zoom&apos;s free time limit
        and disconnected.
      </p>

      <p>
        We&apos;d all spent 45 minutes patiently waiting, only for the stream to
        end just as the important part began.
      </p>

      <p>By the time they realised what had happened, it was too late.</p>

      <p>
        That experience perfectly illustrates why it&apos;s worth spending a
        little time planning beforehand instead of relying on whatever app
        happens to be installed on your phone.
      </p>

      <h2>Not every video app is designed for livestreaming</h2>

      <p>
        Another friend chose a different approach and used a WhatsApp group
        video call.
      </p>

      <p>Technically, it worked.</p>

      <p>Practically, it was chaotic.</p>

      <p>
        Because it was a video meeting rather than a one-way livestream, the
        camera kept switching between participants whenever somebody made a
        noise. Someone coughed, another relative spoke, somebody forgot to mute
        themselves&mdash;and instead of watching the ceremony, viewers found
        themselves looking at different family members&apos; ceilings or faces.
      </p>

      <p>Video meetings are fantastic for conversations.</p>

      <p>They&apos;re usually not the best tool for broadcasting an event.</p>

      <p>
        A wedding isn&apos;t a meeting. People aren&apos;t joining to
        participate&mdash;they&apos;re joining to watch.
      </p>

      {existsSync(join(process.cwd(), "public", equipmentImage)) && (
        <GuideFigure
          src={equipmentImage}
          alt="Wedding livestream checklist with a smartphone, tripod, charger and power bank"
          caption="A simple checklist helps avoid last-minute livestream problems."
        />
      )}

      <h2>Test everything beforehand</h2>

      <p>This is probably the single best piece of advice I can give.</p>

      <p>Don&apos;t let the wedding day be the first time you try your setup.</p>

      <p>
        If you&apos;re using SimchaCam,{" "}
        <Link href="/en/auth" className={inlineLinkClass}>
          create a free event
        </Link>{" "}
        a few days beforehand. Share the viewing link with a friend or family
        member, then walk around the venue while they watch remotely.
      </p>

      <p>You&apos;ll quickly discover:</p>

      <ul>
        <li>Whether your internet connection is reliable.</li>
        <li>Whether the audio is clear.</li>
        <li>Which camera angle works best.</li>
        <li>Whether there are any areas with poor signal.</li>
      </ul>

      <p>
        Even a ten-minute test can reveal problems that would otherwise ruin
        the livestream.
      </p>

      <h2>Use your mobile data instead of venue Wi-Fi</h2>

      <p>People often assume the venue&apos;s Wi-Fi will be the best option.</p>

      <p>In reality, that&apos;s often not the case.</p>

      <p>
        Wedding venues aren&apos;t office buildings. Their Wi-Fi may not have
        strong coverage throughout the property, and guest networks can become
        congested once hundreds of people start connecting.
      </p>

      <p>
        If you have a strong 5G signal, I&apos;d generally recommend using your
        phone&apos;s mobile data instead.
      </p>

      <p>
        Modern mobile networks are remarkably reliable, and because you&apos;re
        not sharing bandwidth with every guest in the room, they often provide
        a smoother streaming experience.
      </p>

      <p>Of course, the key is to test beforehand rather than make assumptions.</p>

      <h2>Choose the right person to operate the stream</h2>

      <p>The bride and groom shouldn&apos;t be worrying about cameras.</p>

      <p>
        Ideally, nominate someone you trust to handle the livestream from start
        to finish.
      </p>

      <p>Choose someone who:</p>

      <ul>
        <li>Is comfortable with technology.</li>
        <li>Can arrive early.</li>
        <li>Will stay focused during the ceremony.</li>
        <li>Has a reliable, modern smartphone.</li>
        <li>Will take the responsibility seriously.</li>
      </ul>

      <p>A livestream is only as good as the person operating it.</p>

      <p>
        At SimchaCam we&apos;re introducing the ability for event organisers to
        nominate someone else as the official streamer, making it easier to
        hand over the technical side while keeping control of the event.
      </p>

      <h2>A good phone really does matter</h2>

      <p>
        You don&apos;t necessarily need the most expensive phone on the market,
        but newer devices generally produce noticeably better results.
      </p>

      <p>Livestreaming isn&apos;t just recording video.</p>

      <p>Your phone is simultaneously:</p>

      <ul>
        <li>Recording video.</li>
        <li>Capturing audio.</li>
        <li>Compressing the footage in real time.</li>
        <li>Uploading it continuously over the internet.</li>
      </ul>

      <p>That&apos;s a demanding workload.</p>

      <p>
        A recent iPhone or flagship Android device will usually provide a
        smoother, more reliable experience than an older handset.
      </p>

      <h2>Use a tripod</h2>

      <p>If I could recommend buying just one accessory, it would be a tripod.</p>

      <p>Holding a phone by hand for an hour or two sounds easy.</p>

      <p>It isn&apos;t.</p>

      <p>Hands get tired.</p>

      <p>People shift position.</p>

      <p>Small movements become distracting for viewers.</p>

      <p>A tripod gives you:</p>

      <ul>
        <li>A much steadier picture.</li>
        <li>A more professional-looking stream.</li>
        <li>Less fatigue for the person filming.</li>
        <li>A better overall viewing experience.</li>
      </ul>

      <p>Sometimes the simplest improvements make the biggest difference.</p>

      <h2>Audio matters more than video</h2>

      <p>Many people obsess over video quality.</p>

      <p>In reality, viewers are surprisingly forgiving of slightly softer video.</p>

      <p>Poor audio is much harder to tolerate.</p>

      <p>Think carefully about where you position the phone.</p>

      <p>
        Avoid placing it directly beside loudspeaker systems, as the microphone
        can become overwhelmed, causing distorted or clipped sound.
      </p>

      <p>
        Instead, try to position the phone where it has a clear view of the
        ceremony while remaining far enough away from speakers that voices
        remain natural and clear.
      </p>

      <p>
        If viewers can hear everything comfortably, they&apos;ll enjoy the
        experience far more.
      </p>

      <h2>Keep the stream private</h2>

      <p>Not every couple wants their wedding broadcast publicly across the internet.</p>

      <p>Many simply want invited family and friends to watch.</p>

      <p>
        That&apos;s why it&apos;s worth choosing a platform that lets you
        control who has access.
      </p>

      <p>
        <Link href="/en#how-it-works" className={inlineLinkClass}>
          Private links
        </Link>{" "}
        and{" "}
        <Link href="/en#pricing" className={inlineLinkClass}>
          password protection
        </Link>{" "}
        give couples confidence that only invited guests can join, while still
        allowing loved ones around the world to be part of the celebration.
      </p>

      <h2>Final thoughts</h2>

      <p>A livestream will never replace being there in person.</p>

      <p>Nothing can.</p>

      <p>
        But for grandparents who can no longer travel, family living overseas,
        friends recovering from illness, or loved ones who simply couldn&apos;t
        make the journey, it can be the next best thing.
      </p>

      <p>
        With a little preparation, a stable internet connection, a tripod, and
        the right platform, you can give those people the opportunity to
        witness one of the happiest days of your life in real time.
      </p>

      <p>That&apos;s exactly why we built SimchaCam.</p>

      <p>
        Our goal wasn&apos;t to create another video meeting app. It was to
        create a simple, private, reliable way for families to share
        life&apos;s biggest moments with the people who matter most&mdash;wherever
        they happen to be.
      </p>
    </>
  ),
};

export default guide;
