import io
import os
import sys
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
import pie

OK = ("Cómo hacer la renta sin perderte: 9 pasos guiados\n✅ Una pregunta por pantalla\n"
      "👉 Disponible en Google Play y en finanverso.app (enlace en el perfil)\n"
      "ℹ️ Datos de demostración. Orientativo, no es asesoramiento. Tú presentas en la Agencia Tributaria.\n"
      "#renta #irpf #finanverso")


class TestPie(unittest.TestCase):
    def test_listo(self):
        self.assertEqual(pie.revisar(OK)["veredicto"], "LISTO")

    def test_fallos(self):
        r = pie.revisar("#mal perfecto " + "#a #b #c #d #e #f " + "x" * 2300)
        self.assertEqual(r["veredicto"], "CORREGIR")
        self.assertGreaterEqual(len(r["fallos"]), 5)

    def test_vacio(self):
        self.assertIn("Pie vacio", pie.revisar("  ")["fallos"])

    def test_avisos(self):
        t = ("Sobre la renta de hacienda, un paso\nhttps://x.es #finanverso\n"
             + "Disponible en Google Play y en finanverso.app\nDatos de demostración 😀" * 1 + "😀" * 13)
        r = pie.revisar(t)
        self.assertEqual(r["veredicto"], "REVISAR")
        self.assertGreaterEqual(len(r["avisos"]), 4)

    def test_visible_corte_palabra(self):
        t = "palabra " * 30
        v = pie.visible(t)
        self.assertLessEqual(len(v), 125)
        self.assertTrue(v.endswith("palabra"))
        self.assertEqual(pie.visible("corto"), "corto")
        self.assertEqual(pie.visible("a" * 200, 10), "a" * 10)
        self.assertEqual(pie.visible("abcde fghij", 5), "abcde")

    def test_main(self):
        buf = io.StringIO()
        with mock.patch("sys.stdin", io.StringIO(OK)), redirect_stdout(buf):
            self.assertEqual(pie.main(), 0)
        with mock.patch("sys.stdin", io.StringIO("x")), redirect_stdout(buf):
            self.assertEqual(pie.main(), 1)


if __name__ == "__main__":
    unittest.main()
