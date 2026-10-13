using System;using System.Linq;using System.IO;using System.Globalization;using System.Reflection;using System.Collections.Generic;using System.Web.Script.Serialization;
namespace ReturnsFromDarkness {
 static class Lang {
  static readonly Dictionary<string,Dictionary<string,string>> Messages=Load();
  static Dictionary<string,Dictionary<string,string>> Load(){using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("launcher-locales.json"))using(var reader=new StreamReader(stream))return new JavaScriptSerializer().Deserialize<Dictionary<string,Dictionary<string,string>>>(reader.ReadToEnd());}
  public static string Resolve(string culture){if(String.IsNullOrEmpty(culture))return "en";string primary=culture.Split('-')[0].ToLowerInvariant();if(primary=="pt")return "pt-BR";if(primary=="zh")return "zh-CN";return Messages.ContainsKey(primary)?primary:"en";}
  public static string Language{get{return Resolve(CultureInfo.CurrentUICulture.Name);}}
  public static bool Rtl{get{return Language=="ar";}}
  public static bool SystemFont{get{return new[]{"ru","uk","ja","ko","zh-CN","ar"}.Contains(Language);}}
  public static string S(string key){string value;if(Messages[Language].TryGetValue(key,out value))return value;if(Messages["en"].TryGetValue(key,out value))return value;return key;}
  public static string Error(string message){foreach(string value in Messages[Language].Values)if(message==value||message.StartsWith(value+" "))return message;return S("error");}
 }
}
