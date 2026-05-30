import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Timeline, Text, Avatar, Group, ScrollArea, Box, 
  Loader, Center, ThemeIcon, Alert
} from '@mantine/core';
import { 
  IconPlus, IconPencil, IconTrash, IconFolder, 
  IconColumns, IconListCheck, IconUsers, IconInfoCircle 
} from '@tabler/icons-react';

interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface ProjectActivityLogProps {
  projectId: string;
}

export default function ProjectActivityLog({ projectId }: ProjectActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel(`activities_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activities',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('project_activities')
        .select('*, profiles(username, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data as ActivityLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action_type: string, entity_type: string) => {
    if (action_type === 'DELETE') return <IconTrash size={12} />;
    if (action_type === 'INSERT') return <IconPlus size={12} />;
    
    // Update icons based on entity
    if (entity_type === 'tasks') return <IconListCheck size={12} />;
    if (entity_type === 'columns') return <IconColumns size={12} />;
    if (entity_type === 'project_members') return <IconUsers size={12} />;
    if (entity_type === 'projects') return <IconFolder size={12} />;
    
    return <IconPencil size={12} />;
  };

  const getActivityColor = (action_type: string) => {
    if (action_type === 'DELETE') return 'red';
    if (action_type === 'INSERT') return 'teal';
    return 'blue';
  };

  const formatActivityText = (log: ActivityLog) => {
    const actor = log.profiles?.username || 'Unknown user';
    const action = log.action_type.toLowerCase();
    let detailsText: React.ReactNode = '';

    try {
      if (log.entity_type === 'tasks') {
        const title = log.details?.new?.title || log.details?.old?.title || 'a task';
        if (action === 'insert') detailsText = <>created task <Text span fw={600} c="zinc.8">"{title}"</Text></>;
        else if (action === 'delete') detailsText = <>deleted task <Text span fw={600} c="zinc.8">"{title}"</Text></>;
        else if (action === 'update') {
          if (log.details?.old?.column_id !== log.details?.new?.column_id) {
            detailsText = <>moved task <Text span fw={600} c="zinc.8">"{title}"</Text></>;
          } else {
            detailsText = <>updated task <Text span fw={600} c="zinc.8">"{title}"</Text></>;
          }
        }
      } 
      else if (log.entity_type === 'columns') {
        const title = log.details?.new?.title || log.details?.old?.title || 'a column';
        if (action === 'insert') detailsText = <>created column <Text span fw={600} c="zinc.8">"{title}"</Text></>;
        else if (action === 'delete') detailsText = <>deleted column <Text span fw={600} c="zinc.8">"{title}"</Text></>;
        else if (action === 'update') detailsText = <>updated column <Text span fw={600} c="zinc.8">"{title}"</Text></>;
      }
      else if (log.entity_type === 'project_members') {
        const role = log.details?.new?.role || log.details?.old?.role;
        if (action === 'insert') detailsText = <>joined the project as <Text span fw={600} c="zinc.8">{role}</Text></>;
        else if (action === 'delete') detailsText = <>left or was removed from the project</>;
        else if (action === 'update') detailsText = <>changed role to <Text span fw={600} c="zinc.8">{role}</Text></>;
      }
      else if (log.entity_type === 'projects') {
        if (action === 'insert') detailsText = <>created the project</>;
        else if (action === 'update') detailsText = <>updated project settings</>;
      }
    } catch (e) {
      detailsText = <>{action}d a {log.entity_type}</>;
    }

    if (!detailsText) {
      detailsText = <>{action}d a {log.entity_type}</>;
    }

    return (
      <Text size="sm" c="dimmed" lh={1.4}>
        <Text span fw={600} c="dark">{actor}</Text> {detailsText}
      </Text>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Center h={200}>
        <Loader size="sm" color="gray" />
      </Center>
    );
  }

  if (logs.length === 0) {
    return (
      <Center h={300}>
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
            <IconInfoCircle size={24} />
          </div>
          <div>
            <Text fw={600} size="sm">No Activity Yet</Text>
            <Text size="sm" c="dimmed" mt={4}>
              When you or your team make changes to the board, they will appear here.
            </Text>
          </div>
        </div>
      </Center>
    );
  }

  return (
    <ScrollArea h="calc(100vh - 60px)" offsetScrollbars className="bg-zinc-50/50 dark:bg-zinc-900/20">
      <Box p="lg">
        <Timeline active={0} bulletSize={28} lineWidth={2} color="gray">
          {logs.map((log, index) => (
            <Timeline.Item 
              key={log.id}
              lineVariant={index === logs.length - 1 ? 'dashed' : 'solid'}
              bullet={
                <ThemeIcon
                  size={28}
                  radius="xl"
                  color={getActivityColor(log.action_type)}
                  variant="light"
                >
                  {getActivityIcon(log.action_type, log.entity_type)}
                </ThemeIcon>
              }
            >
              <div className="flex flex-col gap-1 -mt-1 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm ml-2 mb-2">
                <Group gap="xs" wrap="nowrap" align="center">
                  <Avatar 
                    src={log.profiles?.avatar_url} 
                    size={20} 
                    radius="xl"
                  >
                    {!log.profiles?.avatar_url && log.profiles?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  {formatActivityText(log)}
                </Group>
                <Text c="dimmed" size="xs" ml={28}>
                  {formatTime(log.created_at)}
                </Text>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Box>
    </ScrollArea>
  );
}
