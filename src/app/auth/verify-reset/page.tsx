'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconKey, IconArrowRight } from '@tabler/icons-react';
import { Title, Text, Button, Alert, Box, Center, Flex, ThemeIcon, Stack } from '@mantine/core';

function VerifyResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const code = searchParams.get('code');
  
  const handleConfirm = () => {
    setLoading(true);
    // Use window.location.href to force a full page load.
    // This ensures the server-side callback route is hit directly and cookies are set properly.
    window.location.href = `/auth/callback?code=${code}&next=/auth/update-password`;
  };

  if (!code) {
    return (
      <Box w="100%" maw={400} ta="center">
        <Title order={2} fw={700} lts={-0.5} mb="xs">Invalid Link</Title>
        <Text size="sm" c="dimmed" mb="xl">
          This password reset link appears to be invalid or incomplete.
        </Text>
        <Button
          onClick={() => router.push('/auth/forgot-password')}
          fullWidth 
          color="dark" 
          size="md" 
          radius="sm"
        >
          Request new link
        </Button>
      </Box>
    );
  }

  return (
    <Box w="100%" maw={400}>
      <Stack align="center" ta="center" gap="xs" mb="xl">
        <ThemeIcon size={64} radius="xl" variant="light" color="blue" mb="md">
          <IconKey size={32} />
        </ThemeIcon>
        <Title order={2} fw={700} lts={-0.5}>Reset Password</Title>
        <Text size="sm" c="dimmed">
          Click the button below to verify your request and reset your password.
        </Text>
      </Stack>

      <Alert variant="light" color="blue" radius="sm" mb="xl">
        <Text size="xs" ta="center">
          To protect your account, we require this extra step to ensure the reset link wasn't automatically consumed by an email scanner.
        </Text>
      </Alert>

      <Button
        onClick={handleConfirm}
        loading={loading}
        fullWidth 
        color="dark" 
        size="md" 
        radius="sm"
        rightSection={<IconArrowRight size={16} />}
      >
        Confirm Reset
      </Button>
    </Box>
  );
}

export default function VerifyResetPage() {
  return (
    <Flex mih="100vh" bg="var(--mantine-color-body)">
      <Center flex={1} p="xl" pos="relative">
        <Suspense fallback={<Box w="100%" maw={400} h={256} className="animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-md" />}>
          <VerifyResetContent />
        </Suspense>
      </Center>
      <Box style={{ flex: 1 }} bg="var(--mantine-color-gray-1)" display={{ base: 'none', lg: 'block' }}></Box>
    </Flex>
  );
}
