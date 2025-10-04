'use client';

import { ThemeSelector, ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Theme Demo</h1>
          <p className="text-muted-foreground">
            Test the light and dark theme functionality
          </p>
        </div>

        {/* Theme Controls */}
        <div className="flex justify-center space-x-4">
          <ThemeToggle />
          <ThemeSelector />
        </div>

        {/* Demo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-3">Sample Card</h3>
            <p className="text-muted-foreground mb-4">
              This is a sample card to demonstrate theme colors and styling.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Sample input field"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
              />
              <textarea
                placeholder="Sample textarea"
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
              />
              <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground">
                <option>Sample option 1</option>
                <option>Sample option 2</option>
                <option>Sample option 3</option>
              </select>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-3">Button Variants</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive">Destructive</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-muted rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Muted Background</h3>
            <p className="text-muted-foreground">
              This card uses the muted background color to show contrast.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-3">Color Palette</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-foreground">Primary</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-secondary rounded"></div>
                <span className="text-foreground">Secondary</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <span className="text-foreground">Muted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-destructive rounded"></div>
                <span className="text-foreground">Destructive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Examples */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Typography</h3>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Heading 1</h1>
            <h2 className="text-2xl font-semibold text-foreground">Heading 2</h2>
            <h3 className="text-xl font-medium text-foreground">Heading 3</h3>
            <p className="text-foreground">Regular paragraph text</p>
            <p className="text-muted-foreground">Muted text for less important information</p>
            <p className="text-sm text-muted-foreground">Small muted text</p>
          </div>
        </div>
      </div>
    </div>
  );
}