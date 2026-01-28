import { useState, useEffect } from 'react'
import { X, Download, Printer, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Claim } from '@/types/database'
import { generatePDF, downloadPDF } from '@/utils/pdfGenerator'

interface PDFPreviewModalProps {
  claim: Claim
  isOpen: boolean
  onClose: () => void
}

export function PDFPreviewModal({ claim, isOpen, onClose }: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && claim) {
      setIsLoading(true)
      generatePDF(claim).then((blob) => {
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        setIsLoading(false)
      }).catch((error) => {
        console.error('Ошибка генерации PDF:', error)
        setIsLoading(false)
      })
    } else {
      setPdfUrl(null)
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
    }
  }, [isOpen, claim])

  const handleDownload = async () => {
    if (!claim) return
    await downloadPDF(claim)
  }

  const handlePrint = () => {
    if (!pdfUrl) return
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = pdfUrl
    document.body.appendChild(iframe)
    iframe.onload = () => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }
  }

  const handleWhatsApp = () => {
    if (!claim) return
    const phone = claim.phone.replace(/\D/g, '')
    const message = encodeURIComponent(`Ваш документ готов: ${claim.status === 'completed' ? 'Заказ-наряд' : 'Заявка'} №${claim.number}`)
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const handleTelegram = () => {
    if (!claim) return
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent(`Ваш документ готов: ${claim.status === 'completed' ? 'Заказ-наряд' : 'Заявка'} №${claim.number}`)
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            {claim.status === 'completed' ? 'Заказ-наряд' : 'Заявка'} №{claim.number}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Загрузка PDF...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Ошибка загрузки PDF</p>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center justify-between gap-3 p-4 border-t shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isLoading || !pdfUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading || !pdfUrl}
            >
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTelegram}
            >
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Telegram</span>
            </Button>
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
