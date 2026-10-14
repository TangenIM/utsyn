'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function Modal({ title, onClose, children }: {title:string; onClose:()=>void; children:ReactNode}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const dialog = ref.current;
        dialog?.showModal();
        return () => { dialog?.close(); previous?.focus(); };
    },[]);
    return <dialog ref={ref} aria-label={title} onCancel={event => {event.preventDefault(); onClose();}}
        onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
            const first = controls[0], last = controls.at(-1);
            if (!first) { event.preventDefault(); return; }
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        style={{margin:'auto',padding:0,border:0,background:'transparent',color:'inherit',width:'min(600px, calc(100vw - 32px))',maxHeight:'90vh'}}>
        {children}
    </dialog>;
}
