import Image from "next/image";

type GuideFigureProps = {
  alt: string;
  caption?: string;
  src: string;
};

export default function GuideFigure({
  alt,
  caption,
  src,
}: GuideFigureProps) {
  return (
    <figure className="my-10">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] border border-gold/25 bg-white shadow-[0_18px_50px_rgba(11,31,58,0.11)]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>

      {caption && (
        <figcaption className="mt-3 text-center text-sm leading-6 text-muted-navy">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
