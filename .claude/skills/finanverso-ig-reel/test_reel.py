import io
import os
import sys
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
import ganchos
import tiempos


class TestGanchos(unittest.TestCase):
    def test_bueno(self):
        r = ganchos.evaluar("Deja de apuntar tus gastos a mano en 3 pasos")
        self.assertEqual(r["veredicto"], "BUENO")

    def test_bloqueos(self):
        r = ganchos.evaluar("Hola, el gestor perfecto 🎉")
        self.assertEqual(r["veredicto"], "NO USAR")
        self.assertGreaterEqual(len(r["bloqueos"]), 3)

    def test_largo_corto_vacio(self):
        self.assertTrue(any("largo" in a for a in ganchos.evaluar("uno " * 20)["avisos"]))
        self.assertTrue(any("corto" in a for a in ganchos.evaluar("Mira esto")["avisos"]))
        self.assertEqual(ganchos.evaluar("  ")["veredicto"], "VACIO")

    def test_mejorable_y_flojo(self):
        self.assertIn(ganchos.evaluar("Esto cambia como organizas cosas")["veredicto"], ("MEJORABLE", "FLOJO"))
        self.assertEqual(ganchos.evaluar("a b")["veredicto"], "FLOJO")

    def test_main(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            self.assertEqual(ganchos.main([]), 2)
            self.assertEqual(ganchos.main(["Evita 3 errores en tu Renta"]), 0)
        self.assertIn("BUENO", buf.getvalue())


class TestTiempos(unittest.TestCase):
    def test_esquema_ok(self):
        b, a = tiempos.esquema("Evita tres errores en tu Renta\nPulsa Siguiente y listo\nFin")
        self.assertEqual([x["etiqueta"] for x in b], ["GANCHO", "", "REMATE"])
        self.assertEqual(a, [])

    def test_avisos(self):
        largo = " ".join(["palabra"] * 30)
        b, a = tiempos.esquema(largo + "\n" + largo + "\n" + largo)
        self.assertGreaterEqual(len(a), 3)

    def test_vacio_y_wpm(self):
        self.assertEqual(tiempos.esquema("")[1], ["Guion vacio"])
        with self.assertRaises(ValueError):
            tiempos.esquema("hola", wpm=0)

    def test_main(self):
        buf = io.StringIO()
        with mock.patch("sys.stdin", io.StringIO("Evita tres errores en tu Renta\nListo")), redirect_stdout(buf):
            self.assertEqual(tiempos.main(), 0)
        self.assertIn("GANCHO", buf.getvalue())


if __name__ == "__main__":
    unittest.main()
