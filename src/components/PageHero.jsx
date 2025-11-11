import { Link } from 'react-router-dom';
import HeroSlider from './HeroSlider';

const ALIGNMENT_MAP = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

const ALIGNMENT_TEXT = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

const PageHero = ({
  eyebrow,
  title,
  subtitle,
  description,
  images,
  actions = [],
  interval = 7000,
  align = 'center',
}) => {
  const overlayAlignment = ALIGNMENT_MAP[align] ?? ALIGNMENT_MAP.center;
  const infoAlignment = ALIGNMENT_TEXT[align] ?? ALIGNMENT_TEXT.center;

  return (
    <div className="container mx-auto px-4 pt-6">
      <HeroSlider interval={interval} images={images}>
        <div className={`flex flex-col gap-2 md:gap-3 ${overlayAlignment}`}>
          {eyebrow && (
            <span className="text-xs md:text-sm uppercase tracking-[0.45em] text-sluGold drop-shadow">
              {eyebrow}
            </span>
          )}
          {title && (
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow">
              {title}
            </h1>
          )}
        </div>
      </HeroSlider>
      {(subtitle || description || actions.length > 0) && (
        <div className={`mt-6 flex flex-col gap-4 ${infoAlignment}`}>
          {subtitle && (
            <p className="text-lg md:text-xl font-semibold text-sluBlue">{subtitle}</p>
          )}
          {description && (
            <p className="text-sm md:text-base text-slate-600 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
          {actions.length > 0 && (
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {actions.map((action) =>
                action.to ? (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={`inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold shadow transition-colors ${
                      action.variant === 'secondary'
                        ? 'bg-white text-sluBlue hover:bg-slate-100'
                        : 'bg-sluGold text-sluBlue hover:bg-yellow-400'
                    }`}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <a
                    key={action.label}
                    href={action.href}
                    className={`inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold shadow transition-colors ${
                      action.variant === 'secondary'
                        ? 'bg-white text-sluBlue hover:bg-slate-100'
                        : 'bg-sluGold text-sluBlue hover:bg-yellow-400'
                    }`}
                  >
                    {action.label}
                  </a>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PageHero;

