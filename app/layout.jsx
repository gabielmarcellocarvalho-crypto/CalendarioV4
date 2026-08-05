import "./globals.css";
import Topbar from "./components/Topbar";
import Gate from "./components/Gate";

export const metadata = {
  title: "Calendário SDR · V4 Company",
  description:
    "Agendamento de reuniões com Google Meet para SDR — cria o evento no Google Agenda, convida o lead e gera o link da call.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Gate>
          <Topbar />
          <main className="container">{children}</main>
        </Gate>
      </body>
    </html>
  );
}
