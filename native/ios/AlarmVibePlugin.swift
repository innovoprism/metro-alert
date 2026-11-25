import Foundation
import UIKit
import AVFoundation
import AudioToolbox
import Capacitor
import SwiftUI
#if canImport(AlarmKit)
import AlarmKit

/// iOS 26+: a real system alarm (rings like the Clock app, also on silent and when the app is closed)
@available(iOS 26.0, *)
struct MetroAlarmMeta: AlarmMetadata {}
#endif

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
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alarmAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alarmSchedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alarmCancel", returnType: CAPPluginReturnPromise)
    ]
    private static let alarmIdKey = "metroAlarmKitId"

    private var timer: Timer?
    private var player: AVAudioPlayer?
    private var stopAt: Date?
    private var bgTask: UIBackgroundTaskIdentifier = .invalid

    // Let the app's own sounds (tune previews, web alarm) play even when the ring/silent switch is on
    // silent; mixWithOthers so the user's music is not interrupted.
    override public func load() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
    }

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

    // ---- AlarmKit (iOS 26+). Older iOS answers { supported: false } and the app uses notifications. ----
    @objc func alarmAuth(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                var state = AlarmManager.shared.authorizationState
                if state == .notDetermined { state = (try? await AlarmManager.shared.requestAuthorization()) ?? .denied }
                let name = state == .authorized ? "authorized" : (state == .denied ? "denied" : "notDetermined")
                call.resolve(["supported": true, "authorized": state == .authorized, "state": name])
            }
            return
        }
        #endif
        call.resolve(["supported": false, "authorized": false])
    }

    @objc func alarmSchedule(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            let at = Date(timeIntervalSince1970: (call.getDouble("at") ?? 0) / 1000.0)
            let title = call.getString("title") ?? "Your stop is coming up"
            Task {
                await Self.cancelStored()
                guard AlarmManager.shared.authorizationState == .authorized else { call.resolve(["scheduled": false]); return }
                let stop = AlarmButton(text: "I'm getting off", textColor: .white, systemImageName: "figure.walk")
                let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: title), stopButton: stop)
                let attrs = AlarmAttributes<MetroAlarmMeta>(presentation: AlarmPresentation(alert: alert), metadata: MetroAlarmMeta(), tintColor: Color.red)
                let id = UUID()
                let when = max(at, Date().addingTimeInterval(1))
                do {
                    _ = try await AlarmManager.shared.schedule(id: id, configuration: .alarm(schedule: .fixed(when), attributes: attrs))
                    UserDefaults.standard.set(id.uuidString, forKey: Self.alarmIdKey)
                    call.resolve(["scheduled": true])
                } catch {
                    call.resolve(["scheduled": false, "error": "\(error)"])
                }
            }
            return
        }
        #endif
        call.resolve(["scheduled": false])
    }

    @objc func alarmCancel(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) { Task { await Self.cancelStored(); call.resolve() }; return }
        #endif
        call.resolve()
    }

    #if canImport(AlarmKit)
    @available(iOS 26.0, *)
    private static func cancelStored() async {
        guard let s = UserDefaults.standard.string(forKey: alarmIdKey), let id = UUID(uuidString: s) else { return }
        try? AlarmManager.shared.stop(id: id)
        try? AlarmManager.shared.cancel(id: id)
        UserDefaults.standard.removeObject(forKey: alarmIdKey)
    }
    #endif

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
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
        endBackgroundTask()
    }

    private func endBackgroundTask() {
        if bgTask != .invalid { UIApplication.shared.endBackgroundTask(bgTask); bgTask = .invalid }
    }
}
