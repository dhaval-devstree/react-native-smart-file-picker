require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-smart-file-picker"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/your-org/react-native-smart-file-picker"
  s.license      = package["license"]
  s.author       = { "Your Name" => "you@example.com" }
  s.platforms    = { :ios => "12.0" }
  s.source       = { :git => "https://github.com/your-org/react-native-smart-file-picker.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.0"
  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }

  s.dependency "React-Core"
  s.dependency "TOCropViewController"
end
