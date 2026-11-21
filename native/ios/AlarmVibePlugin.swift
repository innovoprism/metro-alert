import Foundation
import UIKit
import AVFoundation
import AudioToolbox
import Capacitor

/// Wake-up alarm for iOS: vibrates every 1.5 s and (optionally) loops the alarm
/// sound until stop() is called. Uses the .playback audio session, so it keeps
/// running while the app is in the background (Info.plist UIBackgroundModes
/// audio + location) and plays even when the ring/silent switch is on silent.
@objc(AlarmVibePlugin)
public class AlarmVibePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AlarmVibePlugin"
    public let jsName = "AlarmVibe"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private var timer: Timer?
    private var player: AVAudioPlayer?
    private var stopAt: Date?
    private var bgTask: UIBackgroundTaskIdentifier = .invalid

    @objc func start(_ call: CAPPluginCall) {
        let sound = call.getBool("sound") ?? true
        let maxSeconds = call.getInt("maxSeconds") ?? 300
        DispatchQueue.main.async {
            self.stopAll()
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playback, mode: .default, options: sound ? [.duckOthers] : [.mixWithOthers])
            try? session.setActive(true)
            // tune = file inside the app's web folder, e.g. "tunes/chime.wav"
            let tune = call.getString("tune") ?? "tunes/classic.wav"
            let url = Bundle.main.resourceURL?.appendingPathComponent("public").appendingPathComponent(tune)
            if let url = url, FileManager.default.fileExists(atPath: url.path) {
                self.player = try? AVAudioPlayer(contentsOf: url)
                self.player?.numberOfLoops = -1
                // vibrate-only: play silently so iOS keeps the app (and the vibration) running in the background
                self.player?.volume = sound ? 1.0 : 0.0
                self.player?.play()
            }
            self.bgTask = UIApplication.shared.beginBackgroundTask(withName: "MetroAlertAlarm") { self.endBackgroundTask() }
            self.stopAt = Date().addingTimeInterval(TimeInterval(maxSeconds))
            let vibrate = call.getBool("vibrate") ?? true      // tune preview: sound only
            if vibrate { AudioServicesPlayAlertSound(SystemSoundID(kSystemSoundID_Vibrate)) }
            let t = Timer(timeInterval: 1.5, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                if let s = self.stopAt, Date() > s { self.stopAll(); return }
                if vibrate { AudioServicesPlayAlertSound(SystemSoundID(kSystemSoundID_Vibrate)) }
            }
            RunLoop.main.add(t, forMode: .common)
            self.timer = t
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopAll()
            call.resolve()
        }
    }

    private func stopAll() {
        timer?.invalidate(); timer = nil
        player?.stop(); player = nil
        stopAt = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        endBackgroundTask()
    }

    private func endBackgroundTask() {
        if bgTask != .invalid { UIApplication.shared.endBackgroundTask(bgTask); bgTask = .invalid }
    }
}
