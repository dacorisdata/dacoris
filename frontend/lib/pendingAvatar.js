/** Shared MUI Avatar styles for pending (not-yet-accepted) team invites. */
export const pendingInviteAvatarSx = {
  opacity: 0.42,
  filter: 'grayscale(0.9)',
  borderStyle: 'dashed',
};

export function collabAvatarSx(status, base = {}) {
  const pending = status && status !== 'accepted';
  return {
    ...base,
    ...(pending ? pendingInviteAvatarSx : {}),
  };
}
