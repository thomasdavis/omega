'use client';

import {
  Button,
  Input,
  Label,
  Text,
  Heading,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  PageHeader,
  StatCard,
  Pagination,
} from '@repo/ui';

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader
          title="Component Playground"
          description="A comprehensive showcase of all UI components in the Omega design system"
        />

        <div className="mt-12 space-y-16">
          {/* Buttons Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Buttons
            </Heading>

            <div className="space-y-8">
              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Variants
                </Text>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="outline">Outline</Button>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Sizes
                </Text>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  States
                </Text>
                <div className="flex flex-wrap gap-3">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Full Width
                </Text>
                <Button fullWidth>Full Width Button</Button>
              </div>
            </div>
          </section>

          {/* Typography Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Typography
            </Heading>

            <div className="space-y-8">
              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Headings
                </Text>
                <div className="space-y-3">
                  <Heading level="h1">Heading 1</Heading>
                  <Heading level="h2">Heading 2</Heading>
                  <Heading level="h3">Heading 3</Heading>
                  <Heading level="h4">Heading 4</Heading>
                  <Heading level="h5">Heading 5</Heading>
                  <Heading level="h6">Heading 6</Heading>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Text Sizes
                </Text>
                <div className="space-y-2">
                  <Text size="xs">Extra small text</Text>
                  <Text size="sm">Small text</Text>
                  <Text size="base">Base text (default)</Text>
                  <Text size="lg">Large text</Text>
                  <Text size="xl">Extra large text</Text>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Text Weights
                </Text>
                <div className="space-y-2">
                  <Text weight="light">Light weight</Text>
                  <Text weight="normal">Normal weight</Text>
                  <Text weight="medium">Medium weight</Text>
                  <Text weight="semibold">Semibold weight</Text>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Text Colors
                </Text>
                <div className="space-y-2">
                  <Text color="primary">Primary color</Text>
                  <Text color="secondary">Secondary color</Text>
                  <Text color="muted">Muted color</Text>
                </div>
              </div>
            </div>
          </section>

          {/* Badges Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Badges
            </Heading>

            <div className="space-y-8">
              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Variants
                </Text>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Sizes
                </Text>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                  <Badge size="lg">Large</Badge>
                </div>
              </div>
            </div>
          </section>

          {/* Form Elements Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Form Elements
            </Heading>

            <div className="space-y-6 max-w-md">
              <div>
                <Label htmlFor="text-input">Text Input</Label>
                <Input
                  id="text-input"
                  type="text"
                  placeholder="Enter text..."
                />
              </div>

              <div>
                <Label htmlFor="email-input">Email Input</Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="password-input">Password Input</Label>
                <Input
                  id="password-input"
                  type="password"
                  placeholder="Enter password..."
                />
              </div>

              <div>
                <Label htmlFor="disabled-input">Disabled Input</Label>
                <Input
                  id="disabled-input"
                  type="text"
                  placeholder="Disabled..."
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="error-input">Input with Error</Label>
                <Input
                  id="error-input"
                  type="text"
                  placeholder="Enter value..."
                  className="border-red-500"
                />
                <Text size="sm" color="muted" className="mt-1">
                  This field is required
                </Text>
              </div>
            </div>
          </section>

          {/* Cards Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Cards
            </Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text>
                    This is a basic card with a title and content. Cards are
                    useful for grouping related information.
                  </Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Card with Footer</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text>
                    This card includes a footer section with action buttons.
                  </Text>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="primary">
                    Action
                  </Button>
                  <Button size="sm" variant="ghost">
                    Cancel
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Card with Badge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Text>This card demonstrates using badges within cards.</Text>
                    <div className="flex gap-2">
                      <Badge variant="success">Active</Badge>
                      <Badge variant="primary">New</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Stat Cards Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Stat Cards
            </Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Total Users"
                value="1,234"
                trend="+12.5%"
                trendDirection="up"
              />
              <StatCard
                label="Active Sessions"
                value="856"
                trend="+8.2%"
                trendDirection="up"
              />
              <StatCard
                label="Revenue"
                value="$45,678"
                trend="-5.3%"
                trendDirection="down"
              />
              <StatCard
                label="Conversion Rate"
                value="3.24%"
                trend="+0.5%"
                trendDirection="up"
              />
            </div>
          </section>

          {/* Page Header Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Page Headers
            </Heading>

            <div className="space-y-6">
              <PageHeader
                title="Simple Page Header"
                description="A page header with just a title and description"
              />

              <PageHeader
                title="Page Header with Actions"
                description="This header includes action buttons"
              >
                <div className="flex gap-3">
                  <Button size="sm" variant="outline">
                    Secondary
                  </Button>
                  <Button size="sm" variant="primary">
                    Primary Action
                  </Button>
                </div>
              </PageHeader>
            </div>
          </section>

          {/* Pagination Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Pagination
            </Heading>

            <div className="space-y-6">
              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Basic Pagination
                </Text>
                <Pagination
                  currentPage={1}
                  totalPages={10}
                  onPageChange={(page) => console.log('Page:', page)}
                />
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Middle Page
                </Text>
                <Pagination
                  currentPage={5}
                  totalPages={10}
                  onPageChange={(page) => console.log('Page:', page)}
                />
              </div>

              <div>
                <Text size="sm" color="secondary" className="mb-3">
                  Last Page
                </Text>
                <Pagination
                  currentPage={10}
                  totalPages={10}
                  onPageChange={(page) => console.log('Page:', page)}
                />
              </div>
            </div>
          </section>

          {/* Combined Example Section */}
          <section>
            <Heading level="h2" className="mb-6">
              Combined Example
            </Heading>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>User Dashboard</CardTitle>
                    <Text size="sm" color="secondary" className="mt-1">
                      Manage your account settings and preferences
                    </Text>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Messages"
                      value="1,234"
                      trend="+12.5%"
                      trendDirection="up"
                    />
                    <StatCard
                      label="Artifacts"
                      value="56"
                      trend="+8.2%"
                      trendDirection="up"
                    />
                    <StatCard
                      label="Documents"
                      value="89"
                      trend="-5.3%"
                      trendDirection="down"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter username..."
                        defaultValue="john_doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        defaultValue="john@example.com"
                      />
                    </div>

                    <div>
                      <Label>Notification Preferences</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="primary">Email</Badge>
                        <Badge variant="default">Push</Badge>
                        <Badge variant="info">SMS</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="primary">Save Changes</Button>
              </CardFooter>
            </Card>
          </section>
        </div>

        <div className="mt-16 mb-8">
          <Text size="sm" color="muted" align="center">
            Component Playground • Omega Design System
          </Text>
        </div>
      </div>
    </div>
  );
}
