import threading

class KillSwitch:
    def __init__(self):
        self._lock = threading.Lock()
        self._active = False

    def is_active(self) -> bool:
        with self._lock:
            return self._active

    def set_active(self, active: bool) -> None:
        with self._lock:
            self._active = active

killswitch = KillSwitch()
