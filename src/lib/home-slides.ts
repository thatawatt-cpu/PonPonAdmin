export type HomeSlideStatus = 0 | 1 | 2;

export type HomeSlide = {
  id: string;
  image: string;
  badge: string;
  title: string;
  description: string;
  linkUrl: string;
  ctaLabel?: string | null;
  status: HomeSlideStatus;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
};

export const MAX_HOME_SLIDES = 10;
