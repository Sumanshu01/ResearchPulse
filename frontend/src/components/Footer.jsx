import React from 'react';
import { Linkedin, Github, Heart, ExternalLink } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto pt-8 pb-4">
      <div className="glass-card rounded-2xl p-6 border border-brand-border/40 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg hover:shadow-brand-primary/5">
        {/* Left Side: Copyright / Project Branding */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <p className="text-sm font-semibold text-brand-text">
            ResearchPulse
          </p>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Empowering researchers with intelligent publication insights.
          </p>
        </div>

        {/* Middle Side: Developer Credit */}
        <div className="flex items-center gap-1.5 text-sm text-brand-text font-medium bg-brand-bg/50 px-4 py-1.5 rounded-full border border-brand-border/20">
          <span>Developed with</span>
          <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
          <span>by</span>
          <span className="font-bold text-brand-primary hover:text-brand-accent transition-colors duration-200">
            Sumanshu Jindal
          </span>
        </div>

        {/* Right Side: Social / Professional Links */}
        <div className="flex items-center gap-3">
          <a
            href="https://www.linkedin.com/in/sumanshu-jindal01/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-brand-textMuted hover:text-white bg-brand-bg/40 hover:bg-brand-primary/80 border border-brand-border/30 hover:border-transparent transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md hover:shadow-brand-primary/20"
            title="LinkedIn Profile"
          >
            <Linkedin size={15} />
            <span className="hidden sm:inline">LinkedIn</span>
            <ExternalLink size={11} className="opacity-60" />
          </a>
          
          <a
            href="https://github.com/Sumanshu01"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-brand-textMuted hover:text-white bg-brand-bg/40 hover:bg-brand-text/90 border border-brand-border/30 hover:border-transparent transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md hover:shadow-brand-text/20"
            title="GitHub Profile"
          >
            <Github size={15} />
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink size={11} className="opacity-60" />
          </a>
        </div>
      </div>
      
      {/* Small copyright footnote */}
      <div className="text-[10px] text-center text-brand-textMuted/60 mt-4 tracking-wider uppercase font-medium">
        &copy; {new Date().getFullYear()} ResearchPulse. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
