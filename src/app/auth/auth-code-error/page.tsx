'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconAlertCircle } from '@tabler/icons-react';
import { Title, Text, Button, Alert, Box, Center, Flex, ThemeIcon, Stack } from '@mantine/core';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  return (
    <Box w="100%" maw={400}>
      <Stack align="center" ta="center" gap="xs" mb="xl">
        <ThemeIcon size={64} radius="xl" variant="light" color="red" mb="md">
          <IconAlertCircle size={32} />
        </ThemeIcon>
        <Title order={2} fw={700} lts={-0.5}>Authentication Error</Title>
        <Text size="sm" c="dimmed">
          Something went wrong during the authentication process.
        </Text>
      </Stack>

      <Alert variant="light" color="red" radius="sm" mb="xl">
        <Text size="sm" fw={600} mb={4}>
          {error?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN ERROR'}
        </Text>
        <Text size="xs">
          {errorDescription || 'An unexpected error occurred. Please try again or contact support.'}
        </Text>
      </Alert>

      <Stack gap="sm">
        <Button
          component={Link}
          href="/auth"
          fullWidth 
          color="dark" 
          size="md" 
          radius="sm"
        >
          Back to Login
        </Button>
        <Button
          component={Link}
          href="/auth/forgot-password"
          fullWidth 
          variant="default"
          size="md" 
          radius="sm"
        >
          Request new reset link
        </Button>
      </Stack>
    </Box>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Flex mih="100vh" bg="var(--mantine-color-body)">
      <Center flex={1} p="xl" pos="relative">
        <Suspense fallback={<Box w="100%" maw={400} h={256} className="animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-md" />}>
          <ErrorContent />
        </Suspense>
      </Center>
      <Box style={{ flex: 1 }} bg="var(--mantine-color-gray-1)" display={{ base: 'none', lg: 'block' }}></Box>
    </Flex>
  );
}
