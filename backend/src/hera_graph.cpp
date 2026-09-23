#include <napi.h>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <string>
#include <iostream>

using namespace std;

struct DrugMetadata {
    double monthly_cost = 0.0;
    double min_egfr = 0.0;
};

struct PatientContext {
    double monthly_budget = 0.0;
    double current_egfr = 100.0;
};

// In-memory knowledge graph representation
class HeraGraph {
private:
    // Adjacency list mapping a drug to a set of interacting drugs
    unordered_map<string, unordered_set<string>> interactions;
    // Metadata for drugs
    unordered_map<string, DrugMetadata> metadata;

public:
    // Insert a unidirectional contraindication
    void AddContraindication(const string& drugA, const string& drugB) {
        interactions[drugA].insert(drugB);
        interactions[drugB].insert(drugA); // Assuming bidirectional for simplicity
    }

    void SetDrugMetadata(const string& drug, double cost, double min_egfr) {
        metadata[drug] = {cost, min_egfr};
    }

    // Check if a regimen contains any O(N^2) fast lookup contraindications
    // Also checks physiological/economic constraints
    vector<pair<string, string>> ValidateRegimen(const vector<string>& regimen, const PatientContext& ctx) {
        vector<pair<string, string>> violations;
        double total_cost = 0.0;

        for (size_t i = 0; i < regimen.size(); i++) {
            const string& drugA = regimen[i];
            auto metaIt = metadata.find(drugA);
            
            if (metaIt != metadata.end()) {
                total_cost += metaIt->second.monthly_cost;
                if (ctx.current_egfr < metaIt->second.min_egfr) {
                    violations.push_back({drugA, "eGFR Constraint: Min " + to_string(metaIt->second.min_egfr) + ", Patient has " + to_string(ctx.current_egfr)});
                }
            }

            auto it = interactions.find(drugA);
            if (it != interactions.end()) {
                for (size_t j = i + 1; j < regimen.size(); j++) {
                    const string& drugB = regimen[j];
                    if (it->second.find(drugB) != it->second.end()) {
                        violations.push_back({drugA, "Contraindicated with " + drugB});
                    }
                }
            }
        }

        if (ctx.monthly_budget > 0 && total_cost > ctx.monthly_budget) {
             violations.push_back({"BUDGET_EXCEEDED", "Total cost " + to_string(total_cost) + " exceeds budget " + to_string(ctx.monthly_budget)});
        }

        return violations;
    }
};

// Global instance (Thread-safety requires mutex in real prod, but this is a POC)
HeraGraph g_Graph;

// N-API Wrapper to seed the graph (e.g. at startup)
Napi::Value SeedGraph(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "String expected for drugA and drugB").ThrowAsJavaScriptException();
        return env.Null();
    }

    string drugA = info[0].As<Napi::String>().Utf8Value();
    string drugB = info[1].As<Napi::String>().Utf8Value();
    
    g_Graph.AddContraindication(drugA, drugB);
    
    return Napi::Boolean::New(env, true);
}

Napi::Value SetDrugMetadata(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3 || !info[0].IsString() || !info[1].IsNumber() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Expected (string drug, number cost, number min_egfr)").ThrowAsJavaScriptException();
        return env.Null();
    }

    string drug = info[0].As<Napi::String>().Utf8Value();
    double cost = info[1].As<Napi::Number>().DoubleValue();
    double min_egfr = info[2].As<Napi::Number>().DoubleValue();
    
    g_Graph.SetDrugMetadata(drug, cost, min_egfr);
    
    return Napi::Boolean::New(env, true);
}

// N-API Wrapper to validate an array of strings (the regimen) and patient context
Napi::Value ValidateRegimen(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Expected (array of strings, object ctx)").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array arr = info[0].As<Napi::Array>();
    vector<string> regimen;
    for (uint32_t i = 0; i < arr.Length(); i++) {
        Napi::Value val = arr[i];
        if (val.IsString()) {
            regimen.push_back(val.As<Napi::String>().Utf8Value());
        }
    }

    Napi::Object ctxObj = info[1].As<Napi::Object>();
    PatientContext ctx;
    if (ctxObj.Has("budget")) {
        ctx.monthly_budget = ctxObj.Get("budget").As<Napi::Number>().DoubleValue();
    }
    if (ctxObj.Has("egfr")) {
         ctx.current_egfr = ctxObj.Get("egfr").As<Napi::Number>().DoubleValue();
    }

    // Perform validation
    auto violations = g_Graph.ValidateRegimen(regimen, ctx);

    Napi::Array result = Napi::Array::New(env, violations.size());
    for (size_t i = 0; i < violations.size(); i++) {
        Napi::Object violation = Napi::Object::New(env);
        violation.Set("drugA", violations[i].first);
        violation.Set("drugB", violations[i].second);
        result[i] = violation;
    }

    return result;
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "seedGraph"), Napi::Function::New(env, SeedGraph));
    exports.Set(Napi::String::New(env, "setDrugMetadata"), Napi::Function::New(env, SetDrugMetadata));
    exports.Set(Napi::String::New(env, "validateRegimen"), Napi::Function::New(env, ValidateRegimen));
    
    // Seed some massive base logic to prove it works
    g_Graph.AddContraindication("clopidogrel", "omeprazole");
    g_Graph.AddContraindication("simvastatin", "amiodarone");
    g_Graph.AddContraindication("lisinopril", "spironolactone");
    g_Graph.AddContraindication("warfarin", "ibuprofen");

    return exports;
}

NODE_API_MODULE(hera_graph, Init)
