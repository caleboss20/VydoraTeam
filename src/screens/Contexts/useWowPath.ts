/**
 * Orchestrates the first-run wow path from onboarding / empty dashboard.
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProject } from './projectContext';
import { useClip } from './clipContext';
import { useVideoProject } from './VideoProjectContext';
import {
  WOW_PROJECT_DESC,
  WOW_PROJECT_NAME,
  buildWowVideoProject,
  getWowDemoFootage,
  isWowPathDone,
  setWowPathActive,
} from '../services/wowPathService';

export function useWowPath() {
  const navigation = useNavigation<any>();
  const { createProject } = useProject();
  const { addClip } = useClip();
  const { setCurrentVideoProject } = useVideoProject();
  const [starting, setStarting] = useState(false);

  const startWowPath = useCallback(
    async (initialTool: string = 'Captions') => {
      if (starting) return;
      try {
        setStarting(true);
        const done = await isWowPathDone();
        void done;

        const project = await createProject(
          WOW_PROJECT_NAME,
          WOW_PROJECT_DESC,
          'Private'
        );
        const footage = getWowDemoFootage();
        const durationMs = footage.durationMs ?? 12_000;
        const durationLabel = footage.durationLabel || '0:12';

        await addClip(project.id, footage.title, durationLabel, '1080p', {
          videoUrl: footage.url,
          durationSeconds: Math.max(1, Math.round(durationMs / 1000)),
          order: 0,
        });

        const vp = buildWowVideoProject(project.id);
        setCurrentVideoProject(vp);
        await setWowPathActive(true);

        navigation.reset({
          index: 1,
          routes: [
            { name: 'projects' },
            {
              name: 'editorscreen',
              params: { wow: true, initialTool },
            },
          ],
        });
      } catch (e: any) {
        Alert.alert(
          'Couldn’t start demo',
          e?.message ?? 'Check your connection and try again.'
        );
      } finally {
        setStarting(false);
      }
    },
    [
      starting,
      createProject,
      addClip,
      setCurrentVideoProject,
      navigation,
    ]
  );

  return { startWowPath, starting };
}
