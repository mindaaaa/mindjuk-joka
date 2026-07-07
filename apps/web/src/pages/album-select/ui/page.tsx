import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AlbumCard } from './album-card';
import { EmptyState, ErrorState, LoadingState } from './states';
import { useDelayedEnter } from '../model/use-delayed-enter';

import {
  useAlbums,
  useAlbumStore,
  useMainAlbumStore,
  type Album,
} from '@/entities/album';
import { canUpload } from '@/features/auth';
import { track } from '@/shared/lib/analytics';

// 탭 후 배너를 잠깐 보여준 뒤 진입
const NAV_DELAY_MS = 450;
const SINGLE_AUTO_ENTER_MS = 1500;

export function AlbumSelectPage() {
  const navigate = useNavigate();
  const albumsQuery = useAlbums();

  const setCurrent = useAlbumStore((s) => s.setCurrent);
  const mainAlbumId = useMainAlbumStore((s) => s.mainAlbumId);
  const setMain = useMainAlbumStore((s) => s.setMain);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const enteredRef = useRef(false);

  // 메인 앨범을 맨 위로, 나머지는 이름 가나다순
  const albums = useMemo(() => {
    const list = albumsQuery.data ?? [];
    return [...list].sort((a, b) => {
      if (a.id === mainAlbumId) return -1;
      if (b.id === mainAlbumId) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [albumsQuery.data, mainAlbumId]);

  const enterAlbum = useCallback(
    (album: Album) => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      track('album.select', { editable: canUpload(album.role) });

      setCurrent(album);
      navigate('/photos', { replace: true });
    },
    [setCurrent, navigate],
  );

  const { schedule: scheduleEnter, cancel: cancelEnter } =
    useDelayedEnter(enterAlbum);

  const isSingle = albumsQuery.isSuccess && albums.length === 1;
  const singleAlbum = isSingle ? albums[0] : null;

  const listViewTracked = useRef(false);
  useEffect(() => {
    if (albumsQuery.isSuccess && !listViewTracked.current) {
      listViewTracked.current = true;
      track('album.list_view', { count: albumsQuery.data.length });
    }
  }, [albumsQuery.isSuccess, albumsQuery.data]);

  // 앨범이 하나뿐이면 안내 배너를 최소 1.5초 보여준 뒤 자동 진입
  useEffect(() => {
    if (!singleAlbum) return;

    scheduleEnter(singleAlbum, SINGLE_AUTO_ENTER_MS);
    return cancelEnter;
  }, [singleAlbum, scheduleEnter, cancelEnter]);

  const handleSelect = (album: Album) => {
    if (selectedId || enteredRef.current) return; // 중복 트리거 방지

    setSelectedId(album.id);
    scheduleEnter(album, NAV_DELAY_MS);
  };

  // 앨범이 하나뿐이면 선택 연출 생략하고 즉시 진입, 여러 개면 선택 표시 후 진입
  const handleAlbumTap = (album: Album) => {
    if (isSingle) {
      enterAlbum(album);
    } else {
      handleSelect(album);
    }
  };

  if (albumsQuery.isLoading) return <LoadingState />;
  if (albumsQuery.isError) {
    return <ErrorState onRetry={() => albumsQuery.refetch()} />;
  }
  if (albums.length === 0) return <EmptyState />;

  const selected = albums.find((album) => album.id === selectedId) ?? null;

  return (
    <section className="mx-auto w-full max-w-md px-6 pt-6">
      <header className="mb-5">
        <h1 className="text-[22px] font-bold leading-[33px] text-foreground">
          앨범을 선택해주세요
        </h1>
        <p className="mt-1 text-[15px] leading-[22.5px] tracking-[-0.2px] text-muted-foreground">
          {isSingle
            ? '들어갈 앨범을 골라주세요'
            : '속한 앨범 중 하나를 골라 들어가요'}
        </p>
      </header>

      {isSingle && (
        <div className="mb-4 flex items-center gap-2.5 rounded-[14px] bg-muted px-3.5 py-3">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          <span className="text-[13px] leading-[19.5px] text-muted-foreground">
            앨범이 하나뿐이라 바로 들어갈게요
          </span>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {albums.map((album) => (
          <li key={album.id}>
            <AlbumCard
              album={album}
              isMain={album.id === mainAlbumId}
              isSelected={album.id === selectedId}
              onSelect={() => handleAlbumTap(album)}
              onToggleMain={() => setMain(album.id)}
            />
          </li>
        ))}
      </ul>

      {selected && (
        <div className="mt-4 flex items-center gap-2.5 rounded-[14px] bg-primary/10 px-4 py-3.5">
          <p className="text-[13px] font-medium leading-[19.5px] text-primary">
            {selected.name} 앨범으로 이동 중이에요
          </p>
        </div>
      )}
    </section>
  );
}
