'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ── helpers ────────────────────────────────────────────────── */

function generateWrongAnswer(expr: string): string {
  try {
    // sanitize: only digits, operators, dots, parens
    const sanitized = expr.replace(/[^0-9+\-*/.()% ]/g, '')
    if (!sanitized) return 'Error'
    const real = Function(`"use strict"; return (${sanitized})`)() as number
    if (typeof real !== 'number' || !isFinite(real)) return 'Error'
    // offset by a random amount that looks believable but is always wrong
    const offset = Math.floor(Math.random() * 7) + 2 // 2-8
    const direction = Math.random() > 0.5 ? 1 : -1
    let wrong = Math.round((real + direction * offset) * 100) / 100
    if (wrong === real) wrong = real + 3
    return String(wrong)
  } catch {
    return 'Error'
  }
}

function formatCard(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + '/' + digits.slice(2)
}

/* ── constants ──────────────────────────────────────────────── */

const BUTTONS = [
  ['C', '(', ')', '%'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
]

/* ── component ──────────────────────────────────────────────── */

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState('')
  // modal phases: 'form' | 'success' | 'result'
  const [modalPhase, setModalPhase] = useState<'form' | 'success' | 'result'>('form')

  // payment form
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [name, setName] = useState('')

  const handleButton = useCallback((btn: string) => {
    if (showResult) {
      // reset after result shown
      if (btn === 'C') {
        setShowResult(false)
        setResult('')
        setDisplay('0')
        setExpression('')
        return
      }
      setShowResult(false)
      setResult('')
      if ('0123456789'.includes(btn)) {
        setDisplay(btn)
        setExpression(btn)
        return
      }
    }

    if (btn === 'C') {
      setDisplay('0')
      setExpression('')
      return
    }

    if (btn === '=') {
      if (!expression) return
      // open payment modal instead of calculating
      setModalPhase('form')
      setShowPayment(true)
      return
    }

    const newExpr = expression + btn
    setExpression(newExpr)
    // show the full expression on display
    setDisplay(newExpr)
  }, [expression, showResult])

  const handlePay = useCallback(() => {
    if (!cardNumber || !expiry || !cvv || !name) return
    setProcessing(true)
    // Step 1: processing spinner for 2.4s
    setTimeout(() => {
      setProcessing(false)
      setModalPhase('success')
      // Step 2: show "Payment Successful" for 2s, then transition to result
      setTimeout(() => {
        const wrong = generateWrongAnswer(expression)
        setResult(wrong)
        setModalPhase('result')
        setShowResult(true)
        setDisplay(wrong)
        // reset payment form
        setCardNumber('')
        setExpiry('')
        setCvv('')
        setName('')
      }, 2000)
    }, 2400)
  }, [cardNumber, expiry, cvv, name, expression])

  const isPayDisabled = !cardNumber || !expiry || !cvv || !name

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showPayment) return
      const key = e.key
      if ('0123456789'.includes(key)) handleButton(key)
      else if (['+', '-', '*', '/', '%', '.', '(', ')'].includes(key)) handleButton(key)
      else if (key === 'Enter' || key === '=') handleButton('=')
      else if (key === 'Backspace' || key === 'Delete' || key === 'Escape') handleButton('C')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPayment, handleButton])

  return (
    <div className="calc-root">
      <style>{`
        .calc-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f0f4ff;
          font-family: var(--font-montserrat, 'Montserrat', system-ui, sans-serif);
          padding: 20px;
        }
        /* ── calculator shell ── */
        .calc-shell {
          width: 100%;
          max-width: 380px;
          background: #ffffff;
          border-radius: 28px;
          box-shadow:
            0 4px 24px rgba(37,99,235,0.10),
            0 1.5px 6px rgba(37,99,235,0.06);
          overflow: hidden;
          border: 1.5px solid #e0eaff;
        }
        .calc-brand {
          text-align: center;
          padding: 18px 20px 6px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #2563EB;
        }
        .calc-display {
          padding: 12px 24px 18px;
        }
        .calc-expr {
          font-size: 14px;
          color: #94a3b8;
          min-height: 20px;
          text-align: right;
          font-weight: 500;
        }
        .calc-value {
          font-size: 42px;
          font-weight: 700;
          color: #0f172a;
          text-align: right;
          line-height: 1.15;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }
        .calc-value.result-text {
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          white-space: normal;
          word-break: break-word;
        }
        .calc-value::-webkit-scrollbar { display: none; }
        .calc-value.result-flash {
          color: #2563EB;
        }
        /* ── button grid ── */
        .calc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #e8eef8;
          border-top: 1.5px solid #e0eaff;
        }
        .calc-btn {
          all: unset;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 68px;
          font-size: 22px;
          font-weight: 600;
          cursor: pointer;
          background: #ffffff;
          color: #334155;
          transition: background 0.12s, color 0.12s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .calc-btn:active { background: #f0f4ff; }
        .calc-btn.op {
          color: #2563EB;
          font-weight: 700;
        }
        .calc-btn.op:active { background: #e0eaff; }
        .calc-btn.equals {
          background: #2563EB;
          color: #ffffff;
          font-size: 26px;
        }
        .calc-btn.equals:active { background: #1d4ed8; }
        .calc-btn.clear {
          color: #ef4444;
          font-weight: 700;
        }
        /* ── payment overlay ── */
        .pay-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .pay-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 24px;
          padding: 32px 28px 28px;
          box-shadow: 0 24px 64px rgba(37,99,235,0.18);
          border: 1.5px solid #e0eaff;
        }
        .pay-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .pay-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 24px;
        }
        .pay-amount {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0f4ff;
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 24px;
          border: 1px solid #e0eaff;
        }
        .pay-amount-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        .pay-amount-value {
          font-size: 22px;
          font-weight: 800;
          color: #2563EB;
        }
        .pay-field {
          margin-bottom: 14px;
        }
        .pay-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .pay-input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e0eaff;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          color: #0f172a;
          background: #fafbff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .pay-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .pay-input::placeholder { color: #cbd5e1; }
        .pay-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .pay-btn {
          all: unset;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 14px;
          margin-top: 8px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        .pay-btn.primary {
          background: #2563EB;
          color: #ffffff;
        }
        .pay-btn.primary:hover { background: #1d4ed8; }
        .pay-btn.primary:active { transform: scale(0.98); }
        .pay-btn.primary:disabled {
          background: #bfdbfe;
          cursor: not-allowed;
        }
        .pay-btn.secondary {
          background: transparent;
          color: #64748b;
          margin-top: 6px;
        }
        .pay-btn.secondary:hover { color: #0f172a; }
        .pay-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 16px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        /* ── processing spinner ── */
        .pay-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* ── receipt ── */
        .receipt-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #dcfce7;
          color: #16a34a;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 20px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      {/* ── Calculator ── */}
      <motion.div
        className="calc-shell"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="calc-brand">CalcEscape™</div>

        <div className="calc-display">
          <div className="calc-expr">{showResult ? expression + ' =' : '\u00A0'}</div>
          <motion.div
            className={`calc-value ${showResult ? 'result-flash' : ''}`}
            key={display}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {display}
          </motion.div>
        </div>

        <div className="calc-grid">
          {BUTTONS.flat().map((btn) => {
            const isOp = ['/', '*', '-', '+', '%', '(', ')'].includes(btn)
            const isEq = btn === '='
            const isClear = btn === 'C'
            return (
              <motion.button
                key={btn}
                className={`calc-btn ${isOp ? 'op' : ''} ${isEq ? 'equals' : ''} ${isClear ? 'clear' : ''}`}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleButton(btn)}
              >
                {btn}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* ── Payment Modal ── */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            className="pay-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => modalPhase === 'form' && !processing && setShowPayment(false)}
          >
            <motion.div
              className="pay-card"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {modalPhase === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="pay-title">Unlock Result</div>
                    <div className="pay-subtitle">One-time payment to view your calculation</div>

                    <div className="pay-amount">
                      <span className="pay-amount-label">Calculation fee</span>
                      <span className="pay-amount-value">$0.99</span>
                    </div>

                    <div className="pay-field">
                      <label className="pay-label">Cardholder Name</label>
                      <input
                        className="pay-input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={processing}
                      />
                    </div>

                    <div className="pay-field">
                      <label className="pay-label">Card Number</label>
                      <input
                        className="pay-input"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCard(e.target.value))}
                        disabled={processing}
                        inputMode="numeric"
                      />
                    </div>

                    <div className="pay-row">
                      <div className="pay-field">
                        <label className="pay-label">Expiry</label>
                        <input
                          className="pay-input"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          disabled={processing}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="pay-field">
                        <label className="pay-label">CVV</label>
                        <input
                          className="pay-input"
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          disabled={processing}
                          inputMode="numeric"
                          type="password"
                        />
                      </div>
                    </div>

                    <motion.button
                      className="pay-btn primary"
                      disabled={isPayDisabled || processing}
                      onClick={handlePay}
                      whileTap={!isPayDisabled && !processing ? { scale: 0.97 } : {}}
                    >
                      {processing ? (
                        <>
                          <div className="pay-spinner" />
                          Processing...
                        </>
                      ) : (
                        'Pay $0.99'
                      )}
                    </motion.button>

                    {!processing && (
                      <button
                        className="pay-btn secondary"
                        onClick={() => setShowPayment(false)}
                      >
                        Cancel
                      </button>
                    )}

                    <div className="pay-secure">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      Secured with 256-bit encryption
                    </div>
                  </motion.div>
                )}

                {modalPhase === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                      style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
                    >
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </motion.div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Payment Successful</div>
                    <div style={{ fontSize: 14, color: '#64748b' }}>$0.99 charged to your card</div>
                  </motion.div>
                )}

                {modalPhase === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Your Result</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#334155', marginBottom: 8 }}>the result of {expression} is</div>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                      style={{ fontSize: 56, fontWeight: 800, color: '#2563EB', lineHeight: 1.1, marginBottom: 24 }}
                    >
                      {result}
                    </motion.div>
                    <motion.button
                      className="pay-btn primary"
                      onClick={() => {
                        setShowPayment(false)
                        setModalPhase('form')
                      }}
                      whileTap={{ scale: 0.97 }}
                      style={{ maxWidth: 200 }}
                    >
                      Done
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
