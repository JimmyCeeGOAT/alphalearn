import { create } from 'zustand';
import { Profile, TutorMessage } from '@/types';

interface AppState {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  addXp: (amount: number) => void;

  // Tutor
  tutorHistory: TutorMessage[];
  tutorTopicId: string | null;
  setTutorTopic: (id: string | null) => void;
  addTutorMessage: (msg: TutorMessage) => void;
  clearTutorHistory: () => void;

  // Active overlays
  activeLesson: string | null;
  activePractice: { topicId: string; questionId?: string } | null;
  tutorOpen: boolean;
  openLesson: (topicId: string) => void;
  closeLesson: () => void;
  openPractice: (topicId: string, questionId?: string) => void;
  closePractice: () => void;
  openTutor: (topicId: string) => void;
  closeTutor: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  addXp: (amount) =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, xp: s.profile.xp + amount } : null,
    })),

  tutorHistory: [],
  tutorTopicId: null,
  setTutorTopic: (id) => set({ tutorTopicId: id }),
  addTutorMessage: (msg) =>
    set((s) => ({ tutorHistory: [...s.tutorHistory, msg] })),
  clearTutorHistory: () => set({ tutorHistory: [] }),

  activeLesson: null,
  activePractice: null,
  tutorOpen: false,
  openLesson: (topicId) => set({ activeLesson: topicId }),
  closeLesson: () => set({ activeLesson: null }),
  openPractice: (topicId, questionId) =>
    set({ activePractice: { topicId, questionId } }),
  closePractice: () => set({ activePractice: null }),
  openTutor: (topicId) =>
    set({ tutorOpen: true, tutorTopicId: topicId, tutorHistory: [] }),
  closeTutor: () => set({ tutorOpen: false }),
}));
