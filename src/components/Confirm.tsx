import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'

interface Props {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  withReason?: string // rótulo do campo de motivo, se houver
  onConfirm: (reason: string) => void | Promise<unknown>
  onClose: () => void
}

export function Confirm({ title, message, confirmLabel = 'Confirmar', danger, withReason, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Voltar</button>
          <button className={`btn ${danger ? 'danger-solid' : 'primary'}`} onClick={() => onConfirm(reason)}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <div>{message}</div>
        {withReason && (
          <div className="field">
            <label htmlFor="confirm-reason">{withReason}</label>
            <input id="confirm-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </div>
        )}
      </div>
    </Modal>
  )
}
