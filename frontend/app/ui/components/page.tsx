import Button from '@/components/Button';
import Card from '@/components/Card';

export default function ComponentsPreview() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-['Playfair Display'] text-4xl text-ocean">Components</h1>
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-ocean">Buttons</h2>
          <div className="mt-4 flex gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-ocean">Card</h2>
          <p className="text-ocean/70">Use for premium content blocks.</p>
        </Card>
      </div>
    </main>
  );
}

