/**
 * React 19 treats a Promise returned from onSubmit as a form action and resets
 * uncontrolled fields when it settles. Login then looks like a silent failure.
 */
export function withoutReactFormReset<E extends { preventDefault: () => void }>(
  handler: (event?: E) => unknown,
) {
  return (event: E) => {
    event.preventDefault();
    void handler(event);
  };
}
