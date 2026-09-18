import Image from "next/image";
import type { HistoryPhoto } from "@/lib/schema";

/** Photographer and license, linked, as the Creative Commons licenses ask. */
export function PhotoCredit({ photo }: { photo: HistoryPhoto }) {
  return (
    <>
      Photo{" "}
      <a href={photo.credit.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-ink">
        {photo.credit.author}
      </a>
      ,{" "}
      <a href={photo.credit.licenseUrl} target="_blank" rel="noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-ink">
        {photo.credit.license}
      </a>
    </>
  );
}

/** A documentary photograph in a fixed 4:3 frame, printed in black and white like the rest of the proof sheet. */
export function IncidentPhotoFrame({ photo, sizes }: { photo: HistoryPhoto; sizes: string }) {
  return (
    <div className="overflow-hidden rounded-[4px] border border-rule bg-sheet">
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        className="aspect-[4/3] w-full object-cover grayscale"
        style={{ objectPosition: photo.focus }}
      />
    </div>
  );
}

/** Photos for a case's history, each captioned and credited. */
export function IncidentPhotos({ photos }: { photos: readonly HistoryPhoto[] }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-3 sm:gap-5">
      {photos.map((p) => (
        <li key={p.src}>
          <figure>
            <IncidentPhotoFrame photo={p} sizes="(min-width: 1024px) 260px, (min-width: 640px) 30vw, 100vw" />
            <figcaption className="mt-2.5 text-[0.86rem] leading-snug text-ink-2">
              <span className="font-semibold text-ink">{p.refersTo}.</span> {p.caption}
              <span className="mt-1 block text-[0.78rem] text-ink-3">
                <PhotoCredit photo={p} />
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
