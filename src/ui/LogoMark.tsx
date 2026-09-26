import { useId } from 'react'

export function LogoMark({ className }: { className?: string }) {
  const clipId = useId()
  return (
    <svg className={className} viewBox="540 420 850 990" fill="currentColor" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="2000" height="770" />
        </clipPath>
      </defs>
      <path d="M547 758A80 80 0 0 1 627 678H723L683 718H632A45 45 0 0 0 632 808H806L662.8 1166Q622 1268 732 1268H988.4L1030 1164H775.6L918 808H1265A80 80 0 0 1 1345 888V984H1233A116 116 0 0 0 1233 1216H1345V1323A80 80 0 0 1 1265 1403H627A80 80 0 0 1 547 1323Z" />
      <path d="M1233 1024H1363A22 22 0 0 1 1385 1046V1154A22 22 0 0 1 1363 1176H1233A76 76 0 0 1 1233 1024Z" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="-60" y="-44.5" width="498" height="89" rx="28" transform="translate(747 770) rotate(-45)" />
        <rect x="-60" y="0" width="386" height="210" rx="28" transform="translate(908 770) rotate(-45)" />
      </g>
    </svg>
  )
}
