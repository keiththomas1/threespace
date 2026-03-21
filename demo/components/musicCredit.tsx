import { useState } from 'react';
import styles from './musicCredit.module.css';

export interface MusicCreditInfo {
  title: string;
  artist: string;
  url?: string;
  license?: string;
}

export default function MusicCredit({ credit }: { credit: MusicCreditInfo }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={styles.creditButton}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Music credit info"
        title="Music credit info"
      >
        ♪
      </button>
      {isOpen && (
        <div className={styles.popup}>
          <p><strong>{credit.title}</strong></p>
          <p>
            {credit.url
              ? <a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.artist}</a>
              : credit.artist}
          </p>
          {credit.license && <p>{credit.license}</p>}
        </div>
      )}
    </>
  );
}
