'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <h2>Что-то пошло не так!</h2>
        <p>Мы уже работаем над этим.</p>
        <p>Код ошибки: {error?.digest}</p>
        <button onClick={() => reset()}>Попробовать снова</button>
      </body>
    </html>
  );
}
