import { useI18n } from '../i18n'

export default function Footer() {
  const { t } = useI18n()

  return (
    <div className="made-with-selma" aria-hidden={false}>
      <a
        href="https://github.com/berangerthomas/Selma"
        target="_blank"
        rel="noopener noreferrer"
        title={t('built_with_selma', { defaultValue: 'Built with Selma' })}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {t('built_with_selma', { defaultValue: 'Built with Selma' })}
      </a>
    </div>
  )
}
