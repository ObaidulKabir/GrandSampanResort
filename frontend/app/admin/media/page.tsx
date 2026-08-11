import MediaManager from '@/components/admin/MediaManager';

export default function AdminMediaPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Site content</p>
      <h1 className="font-display mt-1 text-4xl text-ocean">Media Library</h1>
      <p className="mt-3 max-w-2xl text-ocean/75">
        Replace the placeholder photography used across the public site with real photos of Grand Sampan Resort.
        Until you upload images for a section, the site falls back to stock photography automatically.
      </p>

      <div className="mt-8 space-y-8">
        <MediaManager
          category="hero"
          title="Homepage hero carousel"
          help="Full-bleed rotating images shown at the top of the homepage. Landscape photos (1920px wide or larger) work best."
          emptyHint="No images uploaded yet — the site is showing placeholder stock photography for this section until you upload real photos."
        />
        <MediaManager
          category="resort"
          title="The Resort gallery"
          help="Images shown in the 'The resort' section on the homepage — pool, common areas, beach, and lounge shots."
          emptyHint="No images uploaded yet — the site is showing placeholder stock photography for this section until you upload real photos."
        />
        <section className="border border-ocean/10 bg-white p-6">
          <h2 className="font-display text-xl text-ocean">Homepage suite type images</h2>
          <p className="mt-1 text-sm text-ocean/70">
            Upload one photo each for Standard, Delux, and Premium. These appear on the homepage available-suites
            cards and anywhere suite-type thumbnails are shown. Until uploaded, the site uses placeholder photography.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <MediaManager
              category="suites"
              fixedLabel="Standard"
              singleImage
              embedded
              title="Standard suite"
              help="Homepage / catalog image for Standard units."
              emptyHint="No Standard suite image yet."
            />
            <MediaManager
              category="suites"
              fixedLabel="Delux"
              singleImage
              embedded
              title="Delux suite"
              help="Homepage / catalog image for Delux units."
              emptyHint="No Delux suite image yet."
            />
            <MediaManager
              category="suites"
              fixedLabel="Premium"
              singleImage
              embedded
              title="Premium suite"
              help="Homepage / catalog image for Premium units."
              emptyHint="No Premium suite image yet."
            />
          </div>
        </section>
        <MediaManager
          category="about_project"
          title="About Project — project views"
          help="Up to two photos shown in the About Project section (/about). Landscape project or exterior shots work best."
          maxImages={2}
          emptyHint="No project images uploaded yet — the About page is showing placeholder graphics until you add up to two photos."
        />
        <MediaManager
          category="design_layout"
          title="Design & Layout"
          help="Master plans, block layouts, and drawings shown on the public Design & Layout page. Upload JPG/PNG/WEBP/GIF images or PDF files. Use caption for the title buyers see."
          allowPdf
          emptyHint="No layout files uploaded yet — the public page shows a default master plan until you add files here."
        />
      </div>
    </main>
  );
}
