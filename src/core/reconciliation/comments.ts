export const buildCommentText = (mode: string, id: number): string =>
  `r:${mode}:${id}`;

export const buildComment = (mode: string, id: number): Comment =>
  new Comment(buildCommentText(mode, id));
