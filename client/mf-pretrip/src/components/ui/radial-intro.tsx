'use client';

import * as React from 'react';
import {
  LayoutGroup,
  motion,
  useAnimate,
  delay,
  type Transition,
  type AnimationSequence,
} from 'motion/react';

interface ComponentProps {
  orbitItems: OrbitItem[];
  stageSize?: number;
  imageSize?: number;
}

type OrbitItem = {
  id: number;
  name: string;
  src: string;
  isGhost?: boolean;
};

const transition: Transition = {
  delay: 0,
  stiffness: 300,
  damping: 35,
  type: 'spring',
  restSpeed: 0.01,
  restDelta: 0.01,
};

const spinConfig = {
  duration: 30,
  ease: 'linear' as const,
  repeat: Infinity,
};

const qsa = (root: Element, sel: string) =>
  Array.from(root.querySelectorAll(sel));

const angleOf = (el: Element) => Number((el as HTMLElement).dataset.angle || 0);

const armOfImg = (img: Element) =>
  (img as HTMLElement).closest('[data-arm]') as HTMLElement | null;

function RadialIntro({
  orbitItems,
  stageSize = 320,
  imageSize = 60,
}: ComponentProps) {
  const step = 360 / orbitItems.length;
  const [scope, animate] = useAnimate();

  React.useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const arms = qsa(root, '[data-arm]');
    const imgs = qsa(root, '[data-arm-image]');
    const stops: Array<() => void> = [];

    delay(() => (animate as any)(imgs, { top: 0 }, transition), 250);

    const orbitPlacementSequence: AnimationSequence = [
      ...arms.map((el): [Element, Record<string, any>, any] => [
        el,
        { rotate: angleOf(el) },
        { ...transition, at: 0 },
      ]),
      ...imgs.map((img): [Element, Record<string, any>, any] => [
        img,
        { rotate: -angleOf(armOfImg(img)!), opacity: 1 },
        { ...transition, at: 0 },
      ]),
    ];

    delay(() => animate(orbitPlacementSequence), 700);

    delay(() => {
      arms.forEach((el) => {
        const angle = angleOf(el);
        const ctrl = animate(el, { rotate: [angle, angle + 360] }, spinConfig);
        stops.push(() => ctrl.cancel());
      });

      imgs.forEach((img) => {
        const arm = armOfImg(img);
        const angle = arm ? angleOf(arm) : 0;
        const ctrl = animate(
          img,
          { rotate: [-angle, -angle - 360] },
          spinConfig,
        );
        stops.push(() => ctrl.cancel());
      });
    }, 1300);

    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <LayoutGroup>
      <motion.div
        ref={scope}
        className="relative overflow-visible"
        style={{ width: stageSize, height: stageSize }}
        initial={false}
      >
        {orbitItems.map((item, i) => (
          <motion.div
            key={item.id}
            data-arm
            className="will-change-transform absolute inset-0"
            style={{ zIndex: orbitItems.length - i }}
            data-angle={i * step}
            layoutId={`arm-${item.id}`}
          >
            {item.isGhost ? (
              <motion.div
                data-arm-image
                className="rounded-full absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 flex items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50/80"
                style={{
                  width: imageSize,
                  height: imageSize,
                  opacity: i === 0 ? 1 : 0,
                }}
                layoutId={`arm-img-${item.id}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-300"
                  style={{ width: imageSize * 0.45, height: imageSize * 0.45 }}
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </motion.div>
            ) : (
              <motion.img
                data-arm-image
                className="rounded-full object-fill absolute left-1/2 top-1/2 aspect-square -translate-x-1/2"
                style={{
                  width: imageSize,
                  height: imageSize,
                  opacity: i === 0 ? 1 : 0,
                }}
                src={item.src}
                alt={item.name}
                draggable={false}
                layoutId={`arm-img-${item.id}`}
              />
            )}
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  );
}

export { RadialIntro };
export type { OrbitItem };
