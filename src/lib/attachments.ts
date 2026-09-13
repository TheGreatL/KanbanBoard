import { supabase } from "./supabase";

export interface TaskAttachment {
  name: string;
  url: string;
  type: string;
  path: string;
}

export async function uploadTaskFile(file: File): Promise<TaskAttachment | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath);

    return {
      name: file.name,
      url: data.publicUrl,
      type: file.type || 'image/png',
      path: filePath,
    };
  } catch (err) {
    console.error("Unexpected error during file upload:", err);
    return null;
  }
}

export async function uploadTaskFiles(files: File[]): Promise<TaskAttachment[]> {
  if (!files || files.length === 0) return [];
  const results: TaskAttachment[] = [];

  for (const file of files) {
    const attachment = await uploadTaskFile(file);
    if (attachment) {
      results.push(attachment);
    }
  }

  return results;
}

