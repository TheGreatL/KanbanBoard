'use client';
import React from 'react';
import Link from 'next/link';
import { 
  Container, Title, Text, Button, Group, Stack, Card, SimpleGrid, 
  ThemeIcon, Badge, Box, Divider, Grid, Flex
} from '@mantine/core';
import { 
  IconChartBar, IconRotateClockwise, IconUsers, IconLock, 
  IconDeviceMobile, IconSettings, IconArrowRight, IconLayoutKanban,
  IconDownload
} from '@tabler/icons-react';

function InstallButton() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt) return null;

  return (
    <Button 
      variant="light" 
      color="blue" 
      size="sm" 
      leftSection={<IconDownload size={16} />}
      onClick={async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      }}
    >
      Install App
    </Button>
  );
}

export default function AboutPage() {
  return (
    <Box bg="var(--mantine-color-body)" mih="100vh">
      {/* Professional Nav */}
      <Box 
        component="nav" 
        pos="sticky" 
        top={0} 
        style={{ zIndex: 200, backdropFilter: 'blur(8px)',borderTop: 0, borderLeft: 0, borderRight: 0, }}
        bg="rgba(var(--mantine-color-body-rgb), 0.85)"
        bd="1px solid var(--mantine-color-default-border)"
       
      >
        <Container size="lg" py="md">
          <Group justify="space-between">
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group gap="xs">
                <img src="/logo.png" alt="KanbanBoard Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
               
              </Group>
            </Link>
            
            <Group>
              <InstallButton />
              <Button component={Link} href="/auth" variant="subtle" color="gray" size="sm">
                Log in
              </Button>
              <Button component={Link} href="/auth" radius="sm" color="dark" size="sm">
                Start for free
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size="lg" pt={120} pb={120}>
        {/* Hero Section */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={80} align="center" mb={120}>
          <Box style={{ flex: '1 1 58%' }}>
            <Stack gap="lg" align="flex-start">
              <Badge variant="outline" color="gray" radius="sm" size="lg" fw={600}>
                Personal Side Project
              </Badge>
              <Title order={1} fw={700} style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                Organize work with absolute clarity.
              </Title>
              <Text size="xl" c="dimmed" style={{ lineHeight: 1.6 }} maw={500}>
                A clean, collaborative Kanban board built for focus. Manage personal projects, align with your team, and track every detail seamlessly.
              </Text>
              <Group mt="sm">
                <Button component={Link} href="/auth" size="md" radius="sm" color="dark" rightSection={<IconArrowRight size={16} />}>
                  Start organizing
                </Button>
              </Group>
            </Stack>
          </Box>
          <Box style={{ flex: '1 1 41%' }}>
            <Card withBorder radius="md" p="xl" shadow="sm" bg="var(--mantine-color-default)">
               {/* Minimalist illustration of a board */}
               <Stack gap="md">
                 <Group grow align="flex-start">
                   <Box bd="1px solid var(--mantine-color-default-border)" p="sm" style={{ borderRadius: 6, backgroundColor: 'var(--mantine-color-body)' }}>
                     <Box h={6} w="40%" bg="var(--mantine-color-dimmed)" mb="xs" style={{ borderRadius: 4 }} opacity={0.5} />
                     <Box h={40} bg="var(--mantine-color-default-hover)" mb="xs" style={{ borderRadius: 4 }} />
                     <Box h={30} bg="var(--mantine-color-default-hover)" style={{ borderRadius: 4 }} />
                   </Box>
                   <Box bd="1px solid var(--mantine-color-default-border)" p="sm" style={{ borderRadius: 6, backgroundColor: 'var(--mantine-color-body)' }}>
                     <Box h={6} w="60%" bg="var(--mantine-color-dimmed)" mb="xs" style={{ borderRadius: 4 }} opacity={0.5} />
                     <Box h={50} bg="var(--mantine-color-default-hover)" style={{ borderRadius: 4 }} />
                   </Box>
                 </Group>
               </Stack>
            </Card>
          </Box>
        </Flex>

        <Divider mb={120} opacity={0.5} />

        {/* Philosophy Section */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={60} mb={120}>
          <Box style={{ flex: '1 1 33%' }}>
            <Title order={2} fw={700} style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
              The Philosophy
            </Title>
          </Box>
          <Box style={{ flex: '1 1 66%' }}>
            <Stack gap="xl" c="dimmed" fz="lg" style={{ lineHeight: 1.7 }}>
              <Text>
                Most enterprise project management tools are bogged down with features you rarely use. On the other end of the spectrum, basic to-do lists fail to provide the visual context needed for continuous workflows.
              </Text>
              <Text>
                This board was engineered specifically to hit the sweet spot: providing powerful, real-time collaboration without the enterprise bloat. It is designed for small teams, independent creators, and precise personal project management.
              </Text>
              <Flex direction={{ base: 'column', sm: 'row' }} gap="xl" mt="md">
                <Box style={{ flex: 1 }}>
                  <Text fw={600} c="var(--mantine-color-text)" mb="xs">100% Free</Text>
                  <Text size="sm">No subscriptions, no hidden tiers. Use the full feature set forever.</Text>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text fw={600} c="var(--mantine-color-text)" mb="xs">Built for Speed</Text>
                  <Text size="sm">Optimized data structures ensure instant updates across all clients globally.</Text>
                </Box>
              </Flex>
            </Stack>
          </Box>
        </Flex>

        <Divider mb={120} opacity={0.5} />

        {/* Features / Use Cases */}
        <Box mb={120}>
          <Title order={2} fw={700} size="2rem" mb="xl" style={{ letterSpacing: '-0.02em' }}>
            Engineered for versatile workflows
          </Title>
          
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            {[
              { icon: IconChartBar, title: "Personal Projects", desc: "Track side hustles and learning goals with absolute precision. Know exactly what needs attention." },
              { icon: IconRotateClockwise, title: "Event Planning", desc: "Coordinate trips or events effortlessly. Share the board and delegate responsibilities in real-time." },
              { icon: IconUsers, title: "Daily Operations", desc: "Manage recurring chores and daily routines using a visual, drag-and-drop methodology." },
              { icon: IconSettings, title: "Custom Columns", desc: "Map out your unique workflow stages. Not everything fits into simple 'To Do' and 'Done' columns." },
              { icon: IconLock, title: "Role-Based Access", desc: "Maintain control over your data by assigning specific viewer or editor roles to collaborators." },
              { icon: IconDeviceMobile, title: "Real-Time Sync", desc: "Powered by Supabase, all data changes propagate instantly to connected clients worldwide." }
            ].map((f, i) => (
              <Card key={i} withBorder radius="md" p="xl" bg="transparent" className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <ThemeIcon size={40} radius="md" variant="light" color="dark" mb="lg">
                  <f.icon size={20} stroke={1.5} />
                </ThemeIcon>
                <Title order={4} fw={600} size="1.1rem" mb="sm">{f.title}</Title>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>{f.desc}</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* CTA Section */}
        <Card withBorder radius="md" p={{ base: 'xl', md: 60 }} bg="var(--mantine-color-text)" c="var(--mantine-color-body)">
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap="xl">
            <Box>
              <Title order={2} fw={700} size="2.5rem" mb="sm" c="var(--mantine-color-body)" style={{ letterSpacing: '-0.02em' }}>
                Ready to optimize your workflow?
              </Title>
              <Text size="lg" opacity={0.8} maw={500}>
                Create an account in seconds and start managing your projects with clarity.
              </Text>
            </Box>
            <Group>
              <Button component={Link} href="/auth" size="lg" radius="sm" color="blue" variant="filled">
                Start for free
              </Button>
            </Group>
          </Flex>
        </Card>
      </Container>

      {/* Footer */}
      <Box 
        component="footer" 
        py="xl" 
        bd="1px solid var(--mantine-color-default-border)"
        style={{ borderBottom: 0, borderLeft: 0, borderRight: 0 }}
      >
        <Container size="lg">
          <Group justify="space-between">
            <Group gap="xs" c="dimmed">
              <IconLayoutKanban size={20} stroke={1.5} />
              <Text fw={600} size="sm">KanbanBoard</Text>
            </Group>
            <Text size="sm" c="dimmed">
              © 2026 Ken Andrew Carlon. All rights reserved.
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
