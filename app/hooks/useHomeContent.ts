import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.client';
import {
  defaultHomeContent,
  HOME_CONTENT_COLLECTION,
  HOME_CONTENT_DOCUMENT_ID,
  normalizeHomeContent,
  type HomeContent,
} from '../lib/home-content';

type HomeContentState = {
  content: HomeContent;
  isLoading: boolean;
  error: Error | null;
};

let cachedHomeContent: HomeContent | null = null;
let pendingHomeContentRequest: Promise<HomeContent> | null = null;

export function invalidateHomeContentCache() {
  cachedHomeContent = null;
  pendingHomeContentRequest = null;
}

async function readHomeContentDocument() {
  const snapshot = await getDoc(doc(db, HOME_CONTENT_COLLECTION, HOME_CONTENT_DOCUMENT_ID));

  return snapshot.exists() ? normalizeHomeContent(snapshot.data()) : defaultHomeContent;
}

export async function loadHomeContent({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    invalidateHomeContentCache();
  }

  if (!forceRefresh && cachedHomeContent) {
    return cachedHomeContent;
  }

  if (!forceRefresh && pendingHomeContentRequest) {
    return pendingHomeContentRequest;
  }

  pendingHomeContentRequest = readHomeContentDocument()
    .then((content) => {
      cachedHomeContent = content;
      return content;
    })
    .finally(() => {
      pendingHomeContentRequest = null;
    });

  return pendingHomeContentRequest;
}

export function useHomeContent({ forceRefresh = false } = {}) {
  const [state, setState] = useState<HomeContentState>(() => ({
    content: forceRefresh ? defaultHomeContent : cachedHomeContent ?? defaultHomeContent,
    isLoading: forceRefresh || !cachedHomeContent,
    error: null,
  }));

  useEffect(() => {
    let isSubscribed = true;

    setState((currentState) => ({
      ...currentState,
      content: forceRefresh ? defaultHomeContent : currentState.content,
      isLoading: forceRefresh || !cachedHomeContent,
      error: null,
    }));

    loadHomeContent({ forceRefresh })
      .then((content) => {
        if (isSubscribed) {
          setState({ content, isLoading: false, error: null });
        }
      })
      .catch((error) => {
        console.error('Home content could not be loaded.', error);

        if (isSubscribed) {
          setState({
            content: cachedHomeContent ?? defaultHomeContent,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Home content could not be loaded.'),
          });
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [forceRefresh]);

  return state;
}
