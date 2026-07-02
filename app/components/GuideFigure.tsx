import Image from "next/image";

type GuideFigureProps = {
  alt: string;
  caption?: string;
  height?: number;
  src: string;
  width?: number;
};

export default function GuideFigure({
  alt,
  caption,
  height = 1024,
  src,
  width = 1536,
}: GuideFigureProps) {
  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-[1.5rem] border border-gold/25 bg-white shadow-[0_18px_50px_rgba(11,31,58,0.11)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full"
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
